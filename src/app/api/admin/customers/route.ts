import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { getSessionUser } from "@/lib/adminAuth";

// Lista clientes (admin/gerente)
export async function GET() {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

  const { data, error } = await supabaseAdmin
    .from("customers")
    .select("*")
    .order("last_order_at", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ customers: data ?? [] });
}

// Cria ou atualiza um cliente manualmente
export async function POST(request: Request) {
  const body = await request.json();
  const phone = (body.phone ?? "").replace(/\D/g, "");
  const name = (body.name ?? "").trim();

  if (!name || phone.length < 10) {
    return NextResponse.json({ error: "Nome e telefone válidos são obrigatórios." }, { status: 400 });
  }

  const row = {
    phone,
    name,
    cep: body.cep || null,
    address: body.address || null,
    address_number: body.address_number || null,
    neighborhood: body.neighborhood || null,
    complement: body.complement || null,
    reference: body.reference || null,
  };

  const { error } = await supabaseAdmin.from("customers").upsert(row, { onConflict: "phone" });
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}

// Deleta um cliente
export async function DELETE(request: Request) {
  const { searchParams } = new URL(request.url);
  const phone = searchParams.get("phone");
  if (!phone) return NextResponse.json({ error: "Telefone obrigatório." }, { status: 400 });

  const { error } = await supabaseAdmin.from("customers").delete().eq("phone", phone);
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
