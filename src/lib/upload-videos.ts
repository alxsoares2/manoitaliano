import fs from "fs";
import path from "path";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const VIDEOS_DIR = path.resolve("fotos/VIDEOS");
const BUCKET = "instagram-videos";

async function ensureBucket() {
  const res = await fetch(`${SUPABASE_URL}/storage/v1/bucket`, {
    method: "POST",
    headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({ id: BUCKET, name: BUCKET, public: true, file_size_limit: 200000000 }),
  });
  if (res.ok) console.log(`✅ Bucket "${BUCKET}" criado`);
  else {
    const body = await res.json();
    if (body.message?.includes("already exists")) console.log(`✅ Bucket "${BUCKET}" já existe`);
    else console.error(`⚠️ ${body.message}`);
  }
}

async function main() {
  if (!SUPABASE_URL || !SUPABASE_KEY) { console.error("❌ Vars Supabase não configuradas"); process.exit(1); }
  if (!fs.existsSync(VIDEOS_DIR)) { console.error(`❌ Pasta não encontrada: ${VIDEOS_DIR}`); process.exit(1); }

  const files = fs.readdirSync(VIDEOS_DIR).filter((f) => /\.(mov|mp4|avi|webm)$/i.test(f)).sort();
  console.log(`\n🎬 Upload de ${files.length} vídeos para Supabase Storage\n`);

  await ensureBucket();

  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    const inputPath = path.join(VIDEOS_DIR, file);
    const outputName = `video-${i + 1}.mov`;
    const fileData = fs.readFileSync(inputPath);
    const sizeMB = (fileData.length / 1024 / 1024).toFixed(1);

    console.log(`  📤 ${file} (${sizeMB}MB) → ${outputName}...`);

    const res = await fetch(`${SUPABASE_URL}/storage/v1/object/${BUCKET}/${outputName}`, {
      method: "POST",
      headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}`, "Content-Type": "video/quicktime", "x-upsert": "true" },
      body: fileData,
    });

    if (res.ok) {
      const url = `${SUPABASE_URL}/storage/v1/object/public/${BUCKET}/${outputName}`;
      console.log(`  ✅ ${url}`);
    } else {
      const err = await res.text();
      console.error(`  ❌ ${res.status}: ${err.slice(0, 100)}`);
    }
  }

  console.log("\n🎬 Upload concluído!");
}

main().catch(console.error);
