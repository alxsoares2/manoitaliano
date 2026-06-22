import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";

const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY!;
const MODEL = "claude-sonnet-4-6";
const MAKE_WEBHOOK_FOTOS = "https://hook.us2.make.com/gmkdnx0e899t36u30pei2c1vusay2eb8";
const MAKE_WEBHOOK_REELS = "https://hook.us2.make.com/4qtrgj4lt8em5usi23t844sj3gse28yb";
const PHOTO_BUCKET = "instagram-posts";
const VIDEO_BUCKET = "instagram-videos";
const ROUTE_SECRET = process.env.REPORT_SECRET ?? "basilico-report-2025";

// 7 posts por semana: 5 fotos + 2 vídeos (intercalados a cada 3 fotos)
const PHOTOS_PER_BATCH = 5;
const VIDEOS_PER_BATCH = 2;

type PostResult = {
  arquivo: string;
  tipo: "foto" | "video";
  url: string;
  sabor: string;
  legenda: string;
  hashtags: string;
};

// ─── Listar arquivos de um bucket ─────────────────────────────────
async function listBucket(bucket: string, ext: RegExp): Promise<string[]> {
  const { data } = await supabaseAdmin.storage.from(bucket).list("", { limit: 500, sortBy: { column: "name", order: "asc" } });
  if (!data) return [];
  return data.filter((f) => ext.test(f.name)).map((f) => f.name).sort();
}

// ─── Controle de usados via store_settings ────────────────────────
async function getUsed(key: string): Promise<string[]> {
  const { data } = await supabaseAdmin.from("store_settings").select("value").eq("key", key).single();
  if (!data?.value) return [];
  try { return JSON.parse(data.value); } catch { return []; }
}

async function saveUsed(key: string, used: string[]) {
  await supabaseAdmin.from("store_settings").upsert({ key, value: JSON.stringify(used) }, { onConflict: "key" });
}

function pickNext(all: string[], used: string[], count: number): string[] {
  let available = all.filter((f) => !used.includes(f));
  if (available.length === 0) {
    // Recomeça
    available = all;
  }
  return available.slice(0, count);
}

// ─── Buscar cardápio e montar prompt ──────────────────────────────
async function buildSystemPrompt(): Promise<string> {
  const { data } = await supabaseAdmin.from("menu_items").select("name, description, category_id, kind").eq("is_active", true).order("category_id");
  const menuRef = (data ?? [])
    .filter((i) => i.kind === "pizza" || i.category_id === "especial")
    .map((i) => `- ${i.name}: ${i.description ?? "sem descrição"}`)
    .join("\n");

  return `Você é um social media especialista em gastronomia para a Basílico Pizzas.

SOBRE A BASÍLICO:
- Pizzaria artesanal em Manaíra, João Pessoa/PB
- Apenas delivery — NÃO mencione salão ou "venha nos visitar"
- Site: basilicopizzas.com.br · Instagram: @basilicopizzas
- Público: 28-45 anos, renda média-alta
- Tom: sofisticado mas acolhedor

CARDÁPIO REAL:
${menuRef}

REGRAS:
1. Identifique o sabor do cardápio que o conteúdo representa
2. Use APENAS ingredientes da descrição — NUNCA invente
3. NÃO mencione forno a lenha, fermentação, métodos de preparo não informados
4. NÃO mencione salão — apenas delivery
5. NÃO coloque preço
6. Tamanhos: "Pizza Média" e "Pizza Grande"
7. Call-to-action: basilicopizzas.com.br

JSON: {"sabor":"...","legenda":"...(máx 2200 chars)","hashtags":"#hash1 #hash2 ...(20-25, incluir #basilicopizzas)"}`;
}

// ─── Gerar legenda para FOTO (com visão) ──────────────────────────
async function generatePhotoCaption(fotoUrl: string, systemPrompt: string): Promise<{ sabor: string; legenda: string; hashtags: string }> {
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
  return { sabor: parsed.sabor ?? "?", legenda: parsed.legenda, hashtags };
}

// ─── Gerar legenda para VÍDEO (sem visão, usa nome do arquivo) ───
async function generateVideoCaption(fileName: string, systemPrompt: string): Promise<{ sabor: string; legenda: string; hashtags: string }> {
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: { "content-type": "application/json", "x-api-key": ANTHROPIC_API_KEY, "anthropic-version": "2023-06-01" },
    body: JSON.stringify({
      model: MODEL, max_tokens: 1024, system: systemPrompt,
      messages: [{ role: "user", content: `Este é um Reels/vídeo de pizza da Basílico Pizzas. O arquivo se chama "${fileName}". Como não consigo ver o vídeo, gere uma legenda genérica mas envolvente para um Reels mostrando uma pizza artesanal sendo preparada ou servida. Foque no processo visual (queijo derretendo, fatia sendo puxada, pizza saindo do forno) e use o tom da marca. Inclua CTA para delivery. Responda com JSON.` }],
    }),
  });

  if (!res.ok) throw new Error(`Claude API ${res.status}`);
  const data = await res.json();
  const text = data.content?.[0]?.text ?? "";
  const parsed = JSON.parse(text.match(/\{[\s\S]*\}/)![0]);
  const hashtags = (parsed.hashtags as string).replace(/#manaira\s*/gi, "").replace(/\s+/g, " ").trim();
  return { sabor: parsed.sabor ?? "Basílico Pizzas", legenda: parsed.legenda, hashtags };
}

// ─── Enviar para Make ─────────────────────────────────────────────
async function sendToMake(item: PostResult): Promise<boolean> {
  try {
    const payload: Record<string, string> = {
      tipo: item.tipo,
      sabor_identificado: item.sabor,
      caption: `${item.legenda}\n\n${item.hashtags}`,
    };
    if (item.tipo === "foto") payload.foto_url = item.url;
    else payload.video_url = item.url;

    const webhookUrl = item.tipo === "video" ? MAKE_WEBHOOK_REELS : MAKE_WEBHOOK_FOTOS;
    const res = await fetch(new URL(webhookUrl).href, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    return res.ok;
  } catch { return false; }
}

// ─── Handler ──────────────────────────────────────────────────────
export async function POST(request: Request) {
  const { searchParams } = new URL(request.url);
  const secret = searchParams.get("secret");
  if (secret !== ROUTE_SECRET) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const systemPrompt = await buildSystemPrompt();

    // Listar fotos e vídeos disponíveis
    const allPhotos = await listBucket(PHOTO_BUCKET, /\.(png|jpe?g)$/i);
    const allVideos = await listBucket(VIDEO_BUCKET, /\.(mov|mp4|webm)$/i);

    const usedPhotos = await getUsed("instagram_used_photos");
    const usedVideos = await getUsed("instagram_used_videos");

    const photosBatch = pickNext(allPhotos, usedPhotos, PHOTOS_PER_BATCH);
    const videosBatch = pickNext(allVideos, usedVideos, VIDEOS_PER_BATCH);

    // Intercalar: foto, foto, foto, VIDEO, foto, foto, VIDEO
    const schedule: { file: string; tipo: "foto" | "video"; bucket: string }[] = [];
    let pi = 0, vi = 0;
    for (let day = 0; day < 7; day++) {
      if ((day === 3 || day === 6) && vi < videosBatch.length) {
        schedule.push({ file: videosBatch[vi++], tipo: "video", bucket: VIDEO_BUCKET });
      } else if (pi < photosBatch.length) {
        schedule.push({ file: photosBatch[pi++], tipo: "foto", bucket: PHOTO_BUCKET });
      } else if (vi < videosBatch.length) {
        schedule.push({ file: videosBatch[vi++], tipo: "video", bucket: VIDEO_BUCKET });
      }
    }

    const results: PostResult[] = [];

    for (const item of schedule) {
      const url = `${SUPABASE_URL}/storage/v1/object/public/${item.bucket}/${encodeURIComponent(item.file)}`;
      try {
        let caption: { sabor: string; legenda: string; hashtags: string };
        if (item.tipo === "foto") {
          caption = await generatePhotoCaption(url, systemPrompt);
        } else {
          caption = await generateVideoCaption(item.file, systemPrompt);
        }

        const result: PostResult = {
          arquivo: item.file, tipo: item.tipo, url,
          sabor: caption.sabor, legenda: caption.legenda, hashtags: caption.hashtags,
        };

        const sent = await sendToMake(result);
        results.push(result);
        console.log(`✅ ${item.tipo} ${item.file} → ${caption.sabor} ${sent ? "(Make OK)" : "(Make falhou)"}`);
      } catch (err) {
        console.error(`❌ ${item.file}: ${err instanceof Error ? err.message : err}`);
        results.push({ arquivo: item.file, tipo: item.tipo, url, sabor: "ERRO", legenda: "", hashtags: "" });
      }
      await new Promise((r) => setTimeout(r, 1500));
    }

    // Salvar usados
    const newUsedPhotos = [...usedPhotos, ...photosBatch];
    const newUsedVideos = [...usedVideos, ...videosBatch];
    // Se resetou, salvar só o batch
    if (photosBatch.length > 0 && !usedPhotos.some((u) => u === photosBatch[0])) {
      await saveUsed("instagram_used_photos", allPhotos.filter((f) => !photosBatch.includes(f)).length === 0 ? photosBatch : newUsedPhotos);
    } else {
      await saveUsed("instagram_used_photos", newUsedPhotos);
    }
    if (videosBatch.length > 0) {
      await saveUsed("instagram_used_videos", allVideos.filter((f) => !usedVideos.includes(f)).length === 0 ? videosBatch : newUsedVideos);
    }

    return NextResponse.json({
      ok: true,
      processados: results.length,
      fotos: { usadas: newUsedPhotos.length, total: allPhotos.length },
      videos: { usadas: newUsedVideos.length, total: allVideos.length },
      schedule: results.map((r) => ({ tipo: r.tipo, arquivo: r.arquivo, sabor: r.sabor, url: r.url })),
    });
  } catch (err) {
    console.error("[instagram/rodar] Error:", err);
    return NextResponse.json({ error: String(err instanceof Error ? err.message : err) }, { status: 500 });
  }
}
