import fs from "fs";
import path from "path";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const PHOTOS_DIR = path.resolve("fotos/FOTOS REDES SOCIAIS");
const POSTS_FILE = path.resolve("posts-gerados.json");
const BUCKET = "instagram-posts";

type Post = {
  foto: string;
  sabor_identificado: string;
  legenda: string;
  hashtags: string;
  gerado_em: string;
  foto_url?: string;
};

function getContentType(ext: string): string {
  const map: Record<string, string> = {
    ".png": "image/png", ".jpg": "image/jpeg", ".jpeg": "image/jpeg",
    ".webp": "image/webp", ".gif": "image/gif",
  };
  return map[ext.toLowerCase()] ?? "image/png";
}

async function ensureBucket() {
  // Tenta criar o bucket (ignora se já existe)
  const res = await fetch(`${SUPABASE_URL}/storage/v1/bucket`, {
    method: "POST",
    headers: {
      apikey: SUPABASE_KEY,
      Authorization: `Bearer ${SUPABASE_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ id: BUCKET, name: BUCKET, public: true }),
  });

  if (res.ok) {
    console.log(`✅ Bucket "${BUCKET}" criado`);
  } else {
    const body = await res.json();
    if (body.message?.includes("already exists")) {
      console.log(`✅ Bucket "${BUCKET}" já existe`);
    } else {
      console.error(`⚠️ Bucket: ${body.message ?? res.status}`);
    }
  }
}

async function uploadFile(filePath: string, fileName: string): Promise<string | null> {
  const fileData = fs.readFileSync(filePath);
  const ext = path.extname(fileName);
  const contentType = getContentType(ext);

  const res = await fetch(`${SUPABASE_URL}/storage/v1/object/${BUCKET}/${fileName}`, {
    method: "POST",
    headers: {
      apikey: SUPABASE_KEY,
      Authorization: `Bearer ${SUPABASE_KEY}`,
      "Content-Type": contentType,
      "x-upsert": "true",
    },
    body: fileData,
  });

  if (!res.ok) {
    const err = await res.text();
    console.error(`  ❌ ${fileName}: ${err.slice(0, 100)}`);
    return null;
  }

  const publicUrl = `${SUPABASE_URL}/storage/v1/object/public/${BUCKET}/${fileName}`;
  return publicUrl;
}

async function main() {
  if (!SUPABASE_URL || !SUPABASE_KEY) {
    console.error("❌ Variáveis Supabase não configuradas");
    process.exit(1);
  }

  if (!fs.existsSync(PHOTOS_DIR)) {
    console.error(`❌ Pasta não encontrada: ${PHOTOS_DIR}`);
    process.exit(1);
  }

  const files = fs.readdirSync(PHOTOS_DIR)
    .filter((f) => /\.(png|jpe?g|webp|gif)$/i.test(f))
    .sort((a, b) => (parseInt(a) || 999) - (parseInt(b) || 999));

  console.log(`\n📸 Upload de ${files.length} fotos para Supabase Storage`);
  console.log(`📦 Bucket: ${BUCKET}\n`);

  await ensureBucket();

  const urlMap: Record<string, string> = {};
  let uploaded = 0;

  for (const file of files) {
    const filePath = path.join(PHOTOS_DIR, file);
    const url = await uploadFile(filePath, file);
    if (url) {
      urlMap[file] = url;
      uploaded++;
      console.log(`  ✅ ${file} → ${url}`);
    }
  }

  console.log(`\n📤 ${uploaded}/${files.length} fotos enviadas`);

  // Atualizar posts-gerados.json com URLs
  if (fs.existsSync(POSTS_FILE)) {
    const posts: Post[] = JSON.parse(fs.readFileSync(POSTS_FILE, "utf-8"));
    let updated = 0;
    for (const post of posts) {
      if (urlMap[post.foto]) {
        post.foto_url = urlMap[post.foto];
        updated++;
      }
    }
    fs.writeFileSync(POSTS_FILE, JSON.stringify(posts, null, 2), "utf-8");
    console.log(`📝 ${updated} posts atualizados com foto_url em posts-gerados.json`);
  } else {
    console.log("⚠️ posts-gerados.json não encontrado — URLs não vinculadas");
    // Salva mapa separado
    fs.writeFileSync("fotos-urls.json", JSON.stringify(urlMap, null, 2), "utf-8");
    console.log("📝 URLs salvas em fotos-urls.json");
  }
}

main().catch(console.error);
