import fs from "fs";
import path from "path";
import sharp from "sharp";

const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY!;
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const MODEL = "claude-sonnet-4-6";

const BRUTAS_DIR = path.resolve("fotos/FOTOS BRUTAS");
const OUTPUT_DIR = path.resolve("fotos/FOTOS REDES SOCIAIS");
const OUTPUT_FILE = path.resolve("posts-gerados.json");

// ─── Etapa 1: Tratamento de imagem ───────────────────────────────
async function processImages(): Promise<string[]> {
  if (!fs.existsSync(BRUTAS_DIR)) {
    console.log("⚠️ Pasta FOTOS BRUTAS não encontrada, pulando tratamento.");
    return [];
  }

  const files = fs.readdirSync(BRUTAS_DIR)
    .filter((f) => /\.(png|jpe?g|webp|tiff?|bmp)$/i.test(f))
    .sort();

  if (files.length === 0) {
    console.log("⚠️ Nenhuma foto bruta encontrada.");
    return [];
  }

  if (!fs.existsSync(OUTPUT_DIR)) fs.mkdirSync(OUTPUT_DIR, { recursive: true });

  console.log(`\n🖼️ Tratando ${files.length} fotos brutas...`);
  const processed: string[] = [];

  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    const inputPath = path.join(BRUTAS_DIR, file);
    const outputName = `${i + 1}.png`;
    const outputPath = path.join(OUTPUT_DIR, outputName);

    try {
      await sharp(inputPath)
        .resize(1080, 1080, { fit: "cover", position: "centre" })
        .png({ quality: 90 })
        .toFile(outputPath);

      processed.push(outputName);
      console.log(`  ✅ ${file} → ${outputName} (1080x1080)`);
    } catch (err) {
      console.error(`  ❌ ${file}: ${err instanceof Error ? err.message : err}`);
    }
  }

  console.log(`\n📁 ${processed.length} fotos tratadas em ${OUTPUT_DIR}\n`);
  return processed;
}

// ─── Etapa 2: Buscar cardápio ─────────────────────────────────────
type MenuItem = {
  name: string;
  description: string | null;
  category_id: string;
  kind: string;
  price: number | null;
  price_media: number | null;
  price_grande: number | null;
};

async function fetchMenu(): Promise<MenuItem[]> {
  const res = await fetch(
    `${SUPABASE_URL}/rest/v1/menu_items?select=name,description,category_id,kind,price,price_media,price_grande&is_active=eq.true&order=category_id,sort_order`,
    { headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}` } }
  );
  if (!res.ok) throw new Error(`Supabase error: ${res.status}`);
  return res.json();
}

function buildMenuReference(items: MenuItem[]): string {
  return items
    .filter((i) => i.kind === "pizza" || i.category_id === "especial")
    .map((i) => `- ${i.name} [${i.category_id}]: ${i.description ?? "sem descrição"}`)
    .join("\n");
}

function buildSystemPrompt(menuRef: string): string {
  return `Você é um social media especialista em gastronomia para a Mano Italiano.

SOBRE A BASÍLICO:
- Pizzaria artesanal em Manaíra, João Pessoa/PB
- Apenas delivery — NÃO mencione salão, restaurante ou "venha nos visitar"
- Site: manoitaliano.com.br
- Instagram: @manoitaliano
- Público: 28-45 anos, renda média-alta
- Tom: sofisticado mas acolhedor, elegante sem ser pretensioso

CARDÁPIO REAL (use APENAS estes ingredientes):
${menuRef}

REGRAS OBRIGATÓRIAS:
1. Analise a foto e identifique qual sabor do cardápio acima ela representa
2. Use APENAS os ingredientes listados na descrição daquele sabor — NUNCA invente ingredientes
3. NUNCA mencione azeitona/azeitona preta — não usamos mais
3. NÃO mencione "forno a lenha", "fermentação de 48h", "fermentação natural" ou qualquer método de preparo que não foi informado
4. NÃO mencione salão, mesa, "venha nos visitar" — apenas delivery
5. NÃO coloque preço na legenda — preço não converte no Instagram
6. Os tamanhos são "Pizza Média" e "Pizza Grande" (não "Médio" ou "Grande")
7. Seja específico sobre o que REALMENTE aparece na foto usando os ingredientes reais
8. Call-to-action: sempre direcionar para manoitaliano.com.br

FORMATO DA RESPOSTA (JSON exato):
{"sabor": "nome do sabor identificado", "legenda": "texto da legenda (máx 2200 chars)", "hashtags": "#hash1 #hash2 ... (20-25 hashtags, sempre incluir #manoitaliano)"}`;
}

// ─── Etapa 3: Gerar legendas ──────────────────────────────────────
type Post = {
  foto: string;
  foto_url?: string;
  sabor_identificado: string;
  legenda: string;
  hashtags: string;
  gerado_em: string;
};

function getMediaType(ext: string): string {
  const map: Record<string, string> = {
    ".png": "image/png", ".jpg": "image/jpeg", ".jpeg": "image/jpeg",
    ".webp": "image/webp", ".gif": "image/gif",
  };
  return map[ext.toLowerCase()] ?? "image/png";
}

async function generateCaption(filePath: string, fileName: string, systemPrompt: string): Promise<Post> {
  const imageData = fs.readFileSync(filePath);
  const base64 = imageData.toString("base64");
  const mediaType = getMediaType(path.extname(fileName));

  console.log(`📸 Processando: ${fileName}...`);

  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-api-key": ANTHROPIC_API_KEY,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: MODEL,
      max_tokens: 1024,
      system: systemPrompt,
      messages: [{
        role: "user",
        content: [
          { type: "image", source: { type: "base64", media_type: mediaType, data: base64 } },
          { type: "text", text: "Identifique o sabor desta pizza no cardápio e gere a legenda usando APENAS os ingredientes reais. Responda com o JSON." },
        ],
      }],
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    console.error(`❌ Erro na API para ${fileName}: ${res.status} ${err}`);
    return { foto: fileName, sabor_identificado: "ERRO", legenda: `[ERRO: ${res.status}]`, hashtags: "", gerado_em: new Date().toISOString() };
  }

  const data = await res.json();
  const text = data.content?.[0]?.text ?? "";

  try {
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error("JSON não encontrado");
    const parsed = JSON.parse(jsonMatch[0]);
    const hashtags = (parsed.hashtags as string).replace(/#manaira\s*/gi, "").replace(/\s+/g, " ").trim();
    console.log(`✅ ${fileName} → ${parsed.sabor} (${parsed.legenda.length} chars)`);
    return {
      foto: fileName,
      sabor_identificado: parsed.sabor ?? "não identificado",
      legenda: parsed.legenda,
      hashtags,
      gerado_em: new Date().toISOString(),
    };
  } catch {
    console.log(`⚠️ ${fileName} — resposta não é JSON, salvando como texto`);
    return { foto: fileName, sabor_identificado: "não identificado", legenda: text, hashtags: "", gerado_em: new Date().toISOString() };
  }
}

// ─── Etapa 4: Enviar para Make webhook ─────────────────────────────
const MAKE_WEBHOOK_URL = "https://hook.us2.make.com/gmkdnx0e899t36u30pei2c1vusay2eb8";

async function sendToMake(posts: Post[]) {
  console.log(`\n🔗 Enviando ${posts.length} posts para Make...`);
  let sent = 0;
  let failed = 0;

  for (const post of posts) {
    try {
      const res = await fetch(MAKE_WEBHOOK_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          foto_url: post.foto_url ?? "",
          sabor_identificado: post.sabor_identificado,
          caption: `${post.legenda}\n\n${post.hashtags}`,
        }),
      });

      if (res.ok) {
        sent++;
        console.log(`  ✅ ${post.foto} → Make`);
      } else {
        failed++;
        console.error(`  ❌ ${post.foto} → Make (${res.status})`);
      }
    } catch (err) {
      failed++;
      console.error(`  ❌ ${post.foto} → ${err instanceof Error ? err.message : err}`);
    }

    await new Promise((r) => setTimeout(r, 500));
  }

  console.log(`\n📤 Make: ${sent} enviados, ${failed} falhas`);
}

// ─── Main ─────────────────────────────────────────────────────────
async function main() {
  if (!ANTHROPIC_API_KEY) { console.error("❌ ANTHROPIC_API_KEY não configurada"); process.exit(1); }
  if (!SUPABASE_URL || !SUPABASE_KEY) { console.error("❌ Variáveis Supabase não configuradas"); process.exit(1); }

  console.log("\n🍕 Mano Italiano — Instagram Agent v3");

  // Etapa 1: Tratar imagens brutas
  const treatedFiles = await processImages();

  // Etapa 2: Buscar cardápio
  console.log("📋 Buscando cardápio no Supabase...");
  const menu = await fetchMenu();
  console.log(`✅ ${menu.length} itens carregados do cardápio\n`);

  const menuRef = buildMenuReference(menu);
  const systemPrompt = buildSystemPrompt(menuRef);

  // Etapa 3: Gerar legendas para fotos tratadas
  const photosDir = OUTPUT_DIR;
  if (!fs.existsSync(photosDir)) { console.error(`❌ Pasta não encontrada: ${photosDir}`); process.exit(1); }

  const files = fs.readdirSync(photosDir)
    .filter((f) => /\.(png|jpe?g|webp|gif)$/i.test(f))
    .sort((a, b) => (parseInt(a) || 999) - (parseInt(b) || 999));

  console.log(`📁 ${files.length} fotos para gerar legendas\n`);

  const posts: Post[] = [];
  for (const file of files) {
    const filePath = path.join(photosDir, file);
    const post = await generateCaption(filePath, file, systemPrompt);
    posts.push(post);
    await new Promise((r) => setTimeout(r, 1000));
  }

  fs.writeFileSync(OUTPUT_FILE, JSON.stringify(posts, null, 2), "utf-8");
  console.log(`\n📝 ${posts.length} posts salvos em ${OUTPUT_FILE}`);
  console.log("\nSabores identificados:");
  posts.forEach((p) => console.log(`  ${p.foto} → ${p.sabor_identificado}`));

  // Etapa 4: Enviar para Make
  await sendToMake(posts);
}

main().catch(console.error);
