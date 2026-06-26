import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { getSessionUser } from "@/lib/adminAuth";

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  if (user.role === "operador") return NextResponse.json({ error: "Sem permissão" }, { status: 403 });

  const { id } = await params;
  const body = await request.json();
  const update: Record<string, unknown> = {};
  if (body.title !== undefined) update.title = body.title.trim();
  if (body.sort_order !== undefined) update.sort_order = body.sort_order;
  if (body.visible !== undefined) update.visible = body.visible;

  const { data, error } = await supabaseAdmin
    .from("menu_categories")
    .update(update)
    .eq("id", id)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ category: data });
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  if (user.role === "operador") return NextResponse.json({ error: "Sem permissão" }, { status: 403 });

  const { id } = await params;

  // Desativar itens da categoria antes de deletar
  await supabaseAdmin
    .from("menu_items")
    .update({ is_active: false, category_id: "sem-categoria" })
    .eq("category_id", id);

  const { error } = await supabaseAdmin.from("menu_categories").delete().eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
