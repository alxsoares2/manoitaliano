import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { getSessionUser } from "@/lib/adminAuth";

export async function GET() {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

  const { data, error } = await supabaseAdmin
    .from("menu_categories")
    .select("*")
    .order("sort_order");

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ categories: data ?? [] });
}

export async function POST(request: Request) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  if (user.role === "operador") return NextResponse.json({ error: "Sem permissão" }, { status: 403 });

  const body = await request.json();
  const { title } = body;
  if (!title?.trim()) return NextResponse.json({ error: "Nome obrigatório" }, { status: 400 });

  const id = title.trim().toLowerCase()
    .normalize("NFD").replace(/[̀-ͯ]/g, "")
    .replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "");

  const { data: maxOrder } = await supabaseAdmin
    .from("menu_categories")
    .select("sort_order")
    .order("sort_order", { ascending: false })
    .limit(1)
    .single();

  const sortOrder = (maxOrder?.sort_order ?? 0) + 1;

  const { data, error } = await supabaseAdmin
    .from("menu_categories")
    .insert({ id, title: title.trim(), sort_order: sortOrder })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ category: data }, { status: 201 });
}
