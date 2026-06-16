import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";

export async function POST(request: Request) {
  const formData = await request.formData();
  const file = formData.get("file") as File | null;
  const itemId = formData.get("itemId") as string | null;

  if (!file || !itemId) {
    return NextResponse.json({ error: "Arquivo e itemId são obrigatórios." }, { status: 400 });
  }

  const ext = file.name.split(".").pop()?.toLowerCase() ?? "jpg";
  const path = `${itemId}.${ext}`;
  const buffer = Buffer.from(await file.arrayBuffer());

  // Remove imagem anterior se existir
  await supabaseAdmin.storage.from("menu-images").remove([path]);

  const { error: uploadError } = await supabaseAdmin.storage
    .from("menu-images")
    .upload(path, buffer, { contentType: file.type, upsert: true });

  if (uploadError) {
    return NextResponse.json({ error: uploadError.message }, { status: 500 });
  }

  const { data } = supabaseAdmin.storage.from("menu-images").getPublicUrl(path);
  const imageUrl = `${data.publicUrl}?t=${Date.now()}`;

  // Salva URL no banco
  const { error: dbError } = await supabaseAdmin
    .from("menu_items")
    .update({ image_url: imageUrl })
    .eq("id", itemId);

  if (dbError) {
    return NextResponse.json({ error: dbError.message }, { status: 500 });
  }

  return NextResponse.json({ imageUrl });
}
