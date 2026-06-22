import fs from "fs";
import path from "path";
import cron from "node-cron";
import sharp from "sharp";

const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY!;
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const MODEL = "claude-sonnet-4-6";

const BRUTAS_DIR = path.resolve("fotos/FOTOS BRUTAS");
const OUTPUT_DIR = path.resolve("fotos/FOTOS REDES SOCIAIS");
const USED_FILE = path.resolve("fotos-usadas.json");
const BATCH_OUTPUT = path.resolve("posts-semanais.json");
const MAKE_WEBHOOK_URL = "https://hook.us2.make.com/gmkdnx0e899t36u30pei2c1vusay2eb8";
const BATCH_SIZE = 7;

type MenuItem = { name: string; description: string | null; category_id: string; kind: string; price: number | null; price_media: number | null; price_grande: number | null };
type Post = { foto: string; foto_url?: string; sabor_identificado: string; legenda: string; hashtags: string; gerado_em: string };

// ─── Controle de fotos usadas ─────────────────────────────────────
function getUsedPhotos(): string[] {
  if (!fs.existsSync(USED_FILE)) return [];
  return JSON.parse(fs.readFileSync(USED_FILE, "utf-8"));
}

function saveUsedPhotos(used: string[]) {
  fs.writeFileSync(USED_FILE, JSON.stringify(used, null, 2), "utf-8");
}

function getNextBatch(): string[] {
  if (!fs.existsSync(BRUTAS_DIR)) return [];

  const allFiles = fs.readdirSync(BRUTAS_DIR)
    .filter((f) => /\.(png|jpe?g|webp|tiff?|bmp)$/i.test(f))
    .sort();

  if (allFiles.length === 0) return [];

  let used = getUsedPhotos();
  let available = allFiles.filter((f) => !used.includes(f));

  // Se acabaram todas, recomeça
  if (available.length === 0) {
    console.log("🔄 Todas as fotos foram usadas — recomeçando do início");
    used = [];
    saveUsedPhotos(used);
    available = allFiles;
  }

  const batch = available.slice(0, BATCH_SIZE);
  return batch;
}

function markAsUsed(files: string[]) {
  const used = getUsedPhotos();
  used.push(...files);
  saveUsedPhotos(used);
}

// ─── Tratar imagem ────────────────────────────────────────────────
async function treatImage(inputPath: string, outputName: string): Promise<string> {
  if (!fs.existsSync(OUTPUT_DIR)) fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  const outputPath = path.join(OUTPUT_DIR, outputName);
  await sharp(inputPath).resize(1080, 1080, { fit: "cover", position: "centre" }).png({ quality: 90 }).toFile(outputPath);
  return outputPath;
}

// ─── Upload para Supabase Storage ─────────────────────────────────
async function uploadToStorage(filePath: string, fileName: string): Promise<string> {
  const fileData = fs.readFileSync(filePath);
  await fetch(`${SUPABASE_URL}/storage/v1/object/instagram-posts/${fileName}`, {
    method: "POST",
    headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}`, "Content-Type": "image/png", "x-upsert": "true" },
    body: fileData,
  });
  return `${SUPABASE_URL}/storage/v1/object/public/instagram-posts/${fileName}`;
}

// ─── Buscar cardápio ──────────────────────────────────────────────
async function fetchMenu(): Promise<MenuItem[]> {
  const res = await fetch(
    `${SUPABASE_URL}/rest/v1/menu_items?select=name,description,category_id,kind,price,price_media,price_grande&is_active=eq.true&order=category_id,sort_order`,
    { headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}` } }
  );
  return res.json();
}

function buildSystemPrompt(items: MenuItem[]): string {
  const menuRef = items
    .filter((i) => i.kind === "pizza" || i.category_id === "especial")
    .map((i) => `- ${i.name} [${i.category_id}]: ${i.description ?? "sem descrição"}`)
    .join("\n");

  return `Você é um social media especialista em gastronomia para a Basílico Pizzas.

SOBRE A BASÍLICO:
- Pizzaria artesanal em Manaíra, João Pessoa/PB
- Apenas delivery — NÃO mencione salão, restaurante ou "venha nos visitar"
- Site: basilicopizzas.com.br
- Instagram: @basilicopizzas
- Público: 28-45 anos, renda média-alta
- Tom: sofisticado mas acolhedor, elegante sem ser pretensioso

CARDÁPIO REAL (use APENAS estes ingredientes):
${menuRef}

REGRAS OBRIGATÓRIAS:
1. Analise a foto e identifique qual sabor do cardápio acima ela representa
2. Use APENAS os ingredientes listados na descrição daquele sabor — NUNCA invente ingredientes
3. NÃO mencione "forno a lenha", "fermentação de 48h", "fermentação natural" ou qualquer método de preparo que não foi informado
4. NÃO mencione salão, mesa, "venha nos visitar" — apenas delivery
5. NÃO coloque preço na legenda — preço não converte no Instagram
6. Os tamanhos são "Pizza Média" e "Pizza Grande" (não "Médio" ou "Grande")
7. Seja específico sobre o que REALMENTE aparece na foto usando os ingredientes reais
8. Call-to-action: sempre direcionar para basilicopizzas.com.br

FORMATO DA RESPOSTA (JSON exato):
{"sabor": "nome do sabor identificado", "legenda": "texto da legenda (máx 2200 chars)", "hashtags": "#hash1 #hash2 ... (20-25 hashtags, sempre incluir #basilicopizzas)"}`;
}

// ─── Gerar legenda ────────────────────────────────────────────────
async function generateCaption(filePath: string, fileName: string, systemPrompt: string): Promise<Post> {
  const base64 = fs.readFileSync(filePath).toString("base64");

  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: { "content-type": "application/json", "x-api-key": ANTHROPIC_API_KEY, "anthropic-version": "2023-06-01" },
    body: JSON.stringify({
      model: MODEL, max_tokens: 1024, system: systemPrompt,
      messages: [{ role: "user", content: [
        { type: "image", source: { type: "base64", media_type: "image/png", data: base64 } },
        { type: "text", text: "Identifique o sabor desta pizza no cardápio e gere a legenda usando APENAS os ingredientes reais. Responda com o JSON." },
      ] }],
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    console.error(`  ❌ ${fileName}: API ${res.status}`);
    return { foto: fileName, sabor_identificado: "ERRO", legenda: `[ERRO: ${res.status}]`, hashtags: "", gerado_em: new Date().toISOString() };
  }

  const data = await res.json();
  const text = data.content?.[0]?.text ?? "";

  try {
    const parsed = JSON.parse(text.match(/\{[\s\S]*\}/)![0]);
    const hashtags = (parsed.hashtags as string).replace(/#manaira\s*/gi, "").replace(/\s+/g, " ").trim();
    return { foto: fileName, sabor_identificado: parsed.sabor ?? "?", legenda: parsed.legenda, hashtags, gerado_em: new Date().toISOString() };
  } catch {
    return { foto: fileName, sabor_identificado: "?", legenda: text, hashtags: "", gerado_em: new Date().toISOString() };
  }
}

// ─── Enviar para Make ─────────────────────────────────────────────
async function sendToMake(post: Post) {
  const res = await fetch(new URL(MAKE_WEBHOOK_URL).href, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      foto_url: post.foto_url ?? "",
      sabor_identificado: post.sabor_identificado,
      caption: `${post.legenda}\n\n${post.hashtags}`,
    }),
  });
  return res.ok;
}

// ─── Processar lote semanal ───────────────────────────────────────
async function processWeeklyBatch() {
  const timestamp = new Date().toLocaleString("pt-BR", { timeZone: "America/Recife" });
  console.log(`\n${"=".repeat(50)}`);
  console.log(`🍕 Instagram Agent — Lote semanal`);
  console.log(`⏰ ${timestamp}`);
  console.log(`${"=".repeat(50)}`);

  const batch = getNextBatch();
  if (batch.length === 0) { console.log("❌ Nenhuma foto disponível."); return; }

  console.log(`\n📸 ${batch.length} fotos selecionadas: ${batch.join(", ")}`);

  // Buscar cardápio
  const menu = await fetchMenu();
  const systemPrompt = buildSystemPrompt(menu);
  console.log(`📋 ${menu.length} itens do cardápio carregados`);

  const posts: Post[] = [];

  for (let i = 0; i < batch.length; i++) {
    const brutaFile = batch[i];
    const outputName = `semana-${Date.now()}-${i + 1}.png`;

    console.log(`\n[${i + 1}/${batch.length}] ${brutaFile}`);

    // Tratar
    const treatedPath = await treatImage(path.join(BRUTAS_DIR, brutaFile), outputName);
    console.log(`  🖼️ Tratada: 1080x1080`);

    // Upload
    const fotoUrl = await uploadToStorage(treatedPath, outputName);
    console.log(`  ☁️ Upload: ${outputName}`);

    // Gerar legenda
    const post = await generateCaption(treatedPath, outputName, systemPrompt);
    post.foto_url = fotoUrl;
    console.log(`  ✍️ ${post.sabor_identificado} (${post.legenda.length} chars)`);

    // Enviar pro Make
    const sent = await sendToMake(post);
    console.log(`  ${sent ? "📤 Enviado pro Make" : "⚠️ Falha no Make"}`);

    posts.push(post);
    await new Promise((r) => setTimeout(r, 1500));
  }

  // Marcar como usadas
  markAsUsed(batch);

  // Salvar lote
  fs.writeFileSync(BATCH_OUTPUT, JSON.stringify(posts, null, 2), "utf-8");

  const used = getUsedPhotos();
  const allFiles = fs.readdirSync(BRUTAS_DIR).filter((f) => /\.(png|jpe?g|webp|tiff?|bmp)$/i.test(f));
  const remaining = allFiles.length - used.length;

  console.log(`\n${"=".repeat(50)}`);
  console.log(`✅ Lote concluído: ${posts.length} posts gerados e enviados`);
  console.log(`📊 Fotos usadas: ${used.length}/${allFiles.length} (restam ${remaining < 0 ? 0 : remaining})`);
  console.log(`${"=".repeat(50)}\n`);
}

// ─── Agendamento ──────────────────────────────────────────────────
const args = process.argv.slice(2);

if (args.includes("--now")) {
  // Modo manual: roda imediatamente
  processWeeklyBatch().catch(console.error);
} else {
  // Modo cron: toda quinta-feira às 18h (Brasília)
  console.log("🍕 Instagram Scheduler iniciado");
  console.log("📅 Próxima execução: toda quinta-feira às 18:00 (Brasília)");
  console.log("💡 Use --now para rodar imediatamente\n");

  cron.schedule("0 18 * * 4", () => {
    processWeeklyBatch().catch(console.error);
  }, { timezone: "America/Recife" });
}
