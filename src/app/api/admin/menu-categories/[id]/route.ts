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

  const { count } = await supabaseAdmin
    .from("menu_items")
    .select("id", { count: "exact", head: true })
    .eq("category_id", id);

  if (count && count > 0) {
    return NextResponse.json({ error: `Categoria tem ${count} item(ns). Mova ou exclua os itens antes.` }, { status: 422 });
  }

  const { error } = await supabaseAdmin.from("menu_categories").delete().eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
