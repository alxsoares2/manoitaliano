import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";

const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY!;
const MODEL = "claude-sonnet-4-6";
const MAKE_WEBHOOK_URL = "https://hook.us2.make.com/gmkdnx0e899t36u30pei2c1vusay2eb8";
const BUCKET = "instagram-posts";
const BATCH_SIZE = 7;
const ROUTE_SECRET = process.env.REPORT_SECRET ?? "basilico-report-2025";

type Post = { foto: string; foto_url: string; sabor: string; legenda: string; hashtags: string };

// ─── Buscar fotos disponíveis no Storage ──────────────────────────
async function listStoragePhotos(): Promise<string[]> {
  const { data, error } = await supabaseAdmin.storage.from(BUCKET).list("", { limit: 500, sortBy: { column: "name", order: "asc" } });
  if (error || !data) return [];
  return data.filter((f) => /\.(png|jpe?g)$/i.test(f.name)).map((f) => f.name).sort((a, b) => (parseInt(a) || 999) - (parseInt(b) || 999));
}

// ─── Controle de fotos usadas via store_settings ──────────────────
async function getUsedPhotos(): Promise<string[]> {
  const { data } = await supabaseAdmin.from("store_settings").select("value").eq("key", "instagram_used_photos").single();
  if (!data?.value) return [];
  try { return JSON.parse(data.value); } catch { return []; }
}

async function saveUsedPhotos(used: string[]) {
  await supabaseAdmin.from("store_settings").upsert({ key: "instagram_used_photos", value: JSON.stringify(used) }, { onConflict: "key" });
}

// ─── Buscar cardápio e montar prompt ──────────────────────────────
async function buildSystemPrompt(): Promise<string> {
  const { data } = await supabaseAdmin
    .from("menu_items")
    .select("name, description, category_id, kind")
    .eq("is_active", true)
    .order("category_id");

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
1. Identifique o sabor do cardápio que a foto representa
2. Use APENAS ingredientes da descrição — NUNCA invente
3. NÃO mencione forno a lenha, fermentação, métodos de preparo não informados
4. NÃO mencione salão — apenas delivery
5. NÃO coloque preço
6. Tamanhos: "Pizza Média" e "Pizza Grande"
7. Call-to-action: basilicopizzas.com.br

JSON: {"sabor":"...","legenda":"...(máx 2200 chars)","hashtags":"#hash1 #hash2 ...(20-25, incluir #basilicopizzas)"}`;
}

// ─── Gerar legenda para uma foto ──────────────────────────────────
async function generateCaption(fotoUrl: string, systemPrompt: string): Promise<{ sabor: string; legenda: string; hashtags: string }> {
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

// ─── Enviar para Make ─────────────────────────────────────────────
async function sendToMake(post: Post): Promise<boolean> {
  try {
    const res = await fetch(new URL(MAKE_WEBHOOK_URL).href, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ foto_url: post.foto_url, sabor_identificado: post.sabor, caption: `${post.legenda}\n\n${post.hashtags}` }),
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
    const allPhotos = await listStoragePhotos();
    if (allPhotos.length === 0) return NextResponse.json({ error: "Nenhuma foto no bucket" }, { status: 404 });

    let used = await getUsedPhotos();
    let available = allPhotos.filter((f) => !used.includes(f));

    if (available.length === 0) {
      used = [];
      await saveUsedPhotos([]);
      available = allPhotos;
    }

    const batch = available.slice(0, BATCH_SIZE);
    const systemPrompt = await buildSystemPrompt();
    const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;

    const results: Post[] = [];

    for (const foto of batch) {
      const fotoUrl = `${SUPABASE_URL}/storage/v1/object/public/${BUCKET}/${foto}`;
      try {
        const { sabor, legenda, hashtags } = await generateCaption(fotoUrl, systemPrompt);
        const post: Post = { foto, foto_url: fotoUrl, sabor, legenda, hashtags };
        const sent = await sendToMake(post);
        results.push(post);
        console.log(`✅ ${foto} → ${sabor} ${sent ? "(Make OK)" : "(Make falhou)"}`);
      } catch (err) {
        console.error(`❌ ${foto}: ${err instanceof Error ? err.message : err}`);
        results.push({ foto, foto_url: fotoUrl, sabor: "ERRO", legenda: "", hashtags: "" });
      }
      await new Promise((r) => setTimeout(r, 1500));
    }

    used.push(...batch);
    await saveUsedPhotos(used);

    return NextResponse.json({
      ok: true,
      processados: results.length,
      fotos_usadas: used.length,
      fotos_totais: allPhotos.length,
      restantes: allPhotos.length - used.length,
      posts: results.map((p) => ({ foto: p.foto, sabor: p.sabor, foto_url: p.foto_url })),
    });
  } catch (err) {
    console.error("[instagram/rodar] Error:", err);
    return NextResponse.json({ error: String(err instanceof Error ? err.message : err) }, { status: 500 });
  }
}
