import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";

const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY!;
const MODEL = "claude-sonnet-4-6";
const PHOTO_BUCKET = "instagram-posts";
const VIDEO_BUCKET = "instagram-videos";
const ROUTE_SECRET = process.env.REPORT_SECRET ?? "basilico-report-2025";

type SyncResult = { arquivo: string; tipo: "foto" | "video"; sabor: string; status: "novo" | "existente" | "erro" };

// ─── Listar arquivos no bucket ────────────────────────────────────
async function listBucket(bucket: string): Promise<string[]> {
  const { data } = await supabaseAdmin.storage.from(bucket).list("", { limit: 1000, sortBy: { column: "name", order: "asc" } });
  if (!data) return [];
  return data.map((f) => f.name);
}

// ─── Buscar legendas já geradas ───────────────────────────────────
async function getGeneratedCaptions(): Promise<Record<string, string>> {
  const { data } = await supabaseAdmin.from("store_settings").select("value").eq("key", "instagram_captions").single();
  if (!data?.value) return {};
  try { return JSON.parse(data.value); } catch { return {}; }
}

async function saveCaptions(captions: Record<string, string>) {
  await supabaseAdmin.from("store_settings").upsert({ key: "instagram_captions", value: JSON.stringify(captions) }, { onConflict: "key" });
}

// ─── Buscar cardápio ──────────────────────────────────────────────
async function buildSystemPrompt(): Promise<string> {
  const { data } = await supabaseAdmin.from("menu_items").select("name, description, category_id, kind").eq("is_active", true).order("category_id");
  const menuRef = (data ?? [])
    .filter((i) => i.kind === "pizza" || i.category_id === "especial")
    .map((i) => `- ${i.name}: ${i.description ?? "sem descrição"}`)
    .join("\n");

  return `Você é um social media especialista em gastronomia para a Mano Italiano.

SOBRE A BASÍLICO:
- Pizzaria artesanal em Manaíra, João Pessoa/PB
- Apenas delivery — NÃO mencione salão ou "venha nos visitar"
- Site: manoitaliano.com.br · Instagram: @manoitaliano
- Público: 28-45 anos, renda média-alta
- Tom: sofisticado mas acolhedor

CARDÁPIO REAL:
${menuRef}

REGRAS:
1. Identifique o sabor do cardápio que o conteúdo representa
2. Use APENAS ingredientes da descrição — NUNCA invente
3. NUNCA mencione azeitona/azeitona preta — não usamos mais
3. NÃO mencione forno a lenha, fermentação, métodos de preparo não informados
4. NÃO mencione salão — apenas delivery
5. NÃO coloque preço
6. Tamanhos: "Pizza Média" e "Pizza Grande"
7. Call-to-action: manoitaliano.com.br

JSON: {"sabor":"...","legenda":"...(máx 2200 chars)","hashtags":"#hash1 #hash2 ...(20-25, incluir #manoitaliano)"}`;
}

// ─── Gerar legenda para foto ──────────────────────────────────────
async function generateCaption(fotoUrl: string, systemPrompt: string): Promise<{ sabor: string; caption: string }> {
  const imgRes = await fetch(fotoUrl);
  const buffer = await imgRes.arrayBuffer();
  const base64 = Buffer.from(buffer).toString("base64");
  const mediaType = fotoUrl.endsWith(".jpg") || fotoUrl.endsWith(".jpeg") ? "image/jpeg" : "image/png";

  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: { "content-type": "application/json", "x-api-key": ANTHROPIC_API_KEY, "anthropic-version": "2023-06-01" },
    body: JSON.stringify({
      model: MODEL, max_tokens: 1024, system: systemPrompt,
      messages: [{ role: "user", content: [
        { type: "image", source: { type: "base64", media_type: mediaType, data: base64 } },
        { type: "text", text: "Identifique o sabor e gere legenda com ingredientes reais. Responda com JSON." },
      ] }],
    }),
  });

  if (!res.ok) throw new Error(`Claude API ${res.status}`);
  const data = await res.json();
  const text = data.content?.[0]?.text ?? "";
  const parsed = JSON.parse(text.match(/\{[\s\S]*\}/)![0]);
  const hashtags = (parsed.hashtags as string).replace(/#manaira\s*/gi, "").replace(/\s+/g, " ").trim();
  return { sabor: parsed.sabor ?? "?", caption: `${parsed.legenda}\n\n${hashtags}` };
}

// ─── Gerar legenda para vídeo ─────────────────────────────────────
async function generateVideoCaption(fileName: string, systemPrompt: string): Promise<{ sabor: string; caption: string }> {
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: { "content-type": "application/json", "x-api-key": ANTHROPIC_API_KEY, "anthropic-version": "2023-06-01" },
    body: JSON.stringify({
      model: MODEL, max_tokens: 1024, system: systemPrompt,
      messages: [{ role: "user", content: `Este é um Reels/vídeo de pizza da Mano Italiano. Arquivo: "${fileName}". Gere uma legenda envolvente para Reels mostrando pizza artesanal. Foque no visual (queijo derretendo, fatia sendo puxada) e use o tom da marca. CTA para delivery. JSON.` }],
    }),
  });

  if (!res.ok) throw new Error(`Claude API ${res.status}`);
  const data = await res.json();
  const text = data.content?.[0]?.text ?? "";
  const parsed = JSON.parse(text.match(/\{[\s\S]*\}/)![0]);
  const hashtags = (parsed.hashtags as string).replace(/#manaira\s*/gi, "").replace(/\s+/g, " ").trim();
  return { sabor: parsed.sabor ?? "Mano Italiano", caption: `${parsed.legenda}\n\n${hashtags}` };
}

// ─── Handler ──────────────────────────────────────────────────────
export async function POST(request: Request) {
  const { searchParams } = new URL(request.url);
  const secret = searchParams.get("secret");
  if (secret !== ROUTE_SECRET) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;

    // Listar tudo no bucket
    const photosInBucket = await listBucket(PHOTO_BUCKET);
    const videosInBucket = await listBucket(VIDEO_BUCKET);

    // Legendas já geradas
    const captions = await getGeneratedCaptions();
    const existingKeys = new Set(Object.keys(captions));

    // Identificar novos (no bucket mas sem legenda)
    const newPhotos = photosInBucket
      .filter((f) => /\.(png|jpe?g)$/i.test(f) && !existingKeys.has(`foto:${f}`));
    const newVideos = videosInBucket
      .filter((f) => /\.(mov|mp4|webm)$/i.test(f) && !existingKeys.has(`video:${f}`));

    if (newPhotos.length === 0 && newVideos.length === 0) {
      return NextResponse.json({
        ok: true,
        message: "Tudo sincronizado — nenhum arquivo novo encontrado.",
        fotos_total: photosInBucket.length,
        videos_total: videosInBucket.length,
        legendas_total: existingKeys.size,
      });
    }

    const systemPrompt = await buildSystemPrompt();
    const results: SyncResult[] = [];

    // Gerar legendas para fotos novas
    for (const file of newPhotos) {
      const url = `${SUPABASE_URL}/storage/v1/object/public/${PHOTO_BUCKET}/${encodeURIComponent(file)}`;
      try {
        const { sabor, caption } = await generateCaption(url, systemPrompt);
        captions[`foto:${file}`] = JSON.stringify({ sabor, caption, url, gerado_em: new Date().toISOString() });
        results.push({ arquivo: file, tipo: "foto", sabor, status: "novo" });
        console.log(`✅ foto ${file} → ${sabor}`);
      } catch (err) {
        results.push({ arquivo: file, tipo: "foto", sabor: "ERRO", status: "erro" });
        console.error(`❌ foto ${file}: ${err instanceof Error ? err.message : err}`);
      }
      await new Promise((r) => setTimeout(r, 1500));
    }

    // Gerar legendas para vídeos novos
    for (const file of newVideos) {
      const url = `${SUPABASE_URL}/storage/v1/object/public/${VIDEO_BUCKET}/${encodeURIComponent(file)}`;
      try {
        const { sabor, caption } = await generateVideoCaption(file, systemPrompt);
        captions[`video:${file}`] = JSON.stringify({ sabor, caption, url, gerado_em: new Date().toISOString() });
        results.push({ arquivo: file, tipo: "video", sabor, status: "novo" });
        console.log(`✅ video ${file} → ${sabor}`);
      } catch (err) {
        results.push({ arquivo: file, tipo: "video", sabor: "ERRO", status: "erro" });
        console.error(`❌ video ${file}: ${err instanceof Error ? err.message : err}`);
      }
      await new Promise((r) => setTimeout(r, 1500));
    }

    await saveCaptions(captions);

    const novos = results.filter((r) => r.status === "novo").length;
    const erros = results.filter((r) => r.status === "erro").length;

    return NextResponse.json({
      ok: true,
      novos,
      erros,
      fotos_total: photosInBucket.length,
      videos_total: videosInBucket.length,
      legendas_total: Object.keys(captions).length,
      detalhes: results,
    });
  } catch (err) {
    console.error("[instagram/sync] Error:", err);
    return NextResponse.json({ error: String(err instanceof Error ? err.message : err) }, { status: 500 });
  }
}
