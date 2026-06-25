import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";

const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY!;
const MODEL = "claude-sonnet-4-6";
const MAKE_WEBHOOK_URL = "https://hook.us2.make.com/gmkdnx0e899t36u30pei2c1vusay2eb8";
const PHOTO_BUCKET = "instagram-posts";
const VIDEO_BUCKET = "instagram-videos";
const ROUTE_SECRET = process.env.REPORT_SECRET ?? "basilico-report-2025";

// Agenda: dia da semana → tipo de post
// 4 = quinta, 5 = sexta, 6 = sábado, 0 = domingo
const SCHEDULE: Record<number, "foto" | "video"> = {
  4: "foto",   // Quinta 19h → foto
  5: "foto",   // Sexta 19h → foto
  6: "video",  // Sábado 19h → reel
  0: "foto",   // Domingo 19h → foto
};

const DAY_NAMES: Record<number, string> = {
  0: "Domingo", 4: "Quinta", 5: "Sexta", 6: "Sábado",
};

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

function pickNext(all: string[], used: string[]): string | null {
  let available = all.filter((f) => !used.includes(f));
  if (available.length === 0) available = all; // recomeça
  return available[0] ?? null;
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
3. NUNCA mencione azeitona/azeitona preta — não usamos mais
3. NÃO mencione forno a lenha, fermentação, métodos de preparo não informados
4. NÃO mencione salão — apenas delivery
5. NÃO coloque preço
6. Tamanhos: "Pizza Média" e "Pizza Grande"
7. Call-to-action: basilicopizzas.com.br

JSON: {"sabor":"...","legenda":"...(máx 2200 chars)","hashtags":"#hash1 #hash2 ...(20-25, incluir #basilicopizzas)"}`;
}

// ─── Gerar legenda para FOTO ──────────────────────────────────────
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

// ─── Gerar legenda para VÍDEO ─────────────────────────────────────
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

    const res = await fetch(new URL(MAKE_WEBHOOK_URL).href, {
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

  // Dia da semana em Brasília
  const now = new Date(new Date().toLocaleString("en-US", { timeZone: "America/Recife" }));
  const dayOfWeek = now.getDay();
  const forceDay = searchParams.get("dia"); // permite forçar: ?dia=6 (sábado)
  const targetDay = forceDay !== null ? parseInt(forceDay) : dayOfWeek;

  const tipo = SCHEDULE[targetDay];
  if (!tipo) {
    return NextResponse.json({
      ok: false,
      message: `Hoje é ${["Domingo","Segunda","Terça","Quarta","Quinta","Sexta","Sábado"][targetDay]} — sem postagem programada. Posts apenas Qui, Sex, Sáb e Dom.`,
      dia: targetDay,
    });
  }

  try {
    const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const systemPrompt = await buildSystemPrompt();

    const bucket = tipo === "foto" ? PHOTO_BUCKET : VIDEO_BUCKET;
    const usedKey = tipo === "foto" ? "instagram_used_photos" : "instagram_used_videos";
    const extPattern = tipo === "foto" ? /\.(png|jpe?g)$/i : /\.(mov|mp4|webm)$/i;

    const allFiles = await listBucket(bucket, extPattern);
    if (allFiles.length === 0) {
      return NextResponse.json({ error: `Nenhum ${tipo === "foto" ? "foto" : "vídeo"} no bucket` }, { status: 404 });
    }

    let used = await getUsed(usedKey);
    const file = pickNext(allFiles, used);
    if (!file) return NextResponse.json({ error: "Nenhum arquivo disponível" }, { status: 404 });

    // Se recomeçou o ciclo, resetar usados
    if (!allFiles.some((f) => !used.includes(f))) used = [];

    const url = `${SUPABASE_URL}/storage/v1/object/public/${bucket}/${encodeURIComponent(file)}`;

    let caption: { sabor: string; legenda: string; hashtags: string };
    if (tipo === "foto") {
      caption = await generatePhotoCaption(url, systemPrompt);
    } else {
      caption = await generateVideoCaption(file, systemPrompt);
    }

    const result: PostResult = {
      arquivo: file, tipo, url,
      sabor: caption.sabor, legenda: caption.legenda, hashtags: caption.hashtags,
    };

    const sent = await sendToMake(result);

    // Marcar como usado
    used.push(file);
    await saveUsed(usedKey, used);

    return NextResponse.json({
      ok: true,
      dia: DAY_NAMES[targetDay],
      tipo,
      arquivo: file,
      sabor: caption.sabor,
      url,
      make_enviado: sent,
      usados: used.length,
      total: allFiles.length,
      restantes: allFiles.length - used.length,
    });
  } catch (err) {
    console.error("[instagram/rodar] Error:", err);
    return NextResponse.json({ error: String(err instanceof Error ? err.message : err) }, { status: 500 });
  }
}
