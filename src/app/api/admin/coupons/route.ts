import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";

// Cria ou atualiza um cupom
export async function POST(request: Request) {
  const body = await request.json();
  const code = (body.code ?? "").trim().toUpperCase();

  if (!code) return NextResponse.json({ error: "Código obrigatório." }, { status: 400 });
  if (body.type !== "fixed" && body.type !== "percent") {
    return NextResponse.json({ error: "Tipo inválido." }, { status: 400 });
  }
  const value = Number(body.value);
  if (!value || value <= 0) {
    return NextResponse.json({ error: "Valor inválido." }, { status: 400 });
  }

  const row = {
    code,
    type: body.type as "fixed" | "percent",
    value,
    max_uses: body.max_uses != null && body.max_uses !== "" ? Number(body.max_uses) : null,
    max_uses_per_customer:
      body.max_uses_per_customer != null && body.max_uses_per_customer !== ""
        ? Number(body.max_uses_per_customer)
        : null,
    valid_until: body.valid_until ? new Date(body.valid_until).toISOString() : null,
    active: body.active ?? true,
  };

  const { error } = await supabaseAdmin.from("coupons").upsert(row, { onConflict: "code" });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ ok: true });
}

// Deleta um cupom
export async function DELETE(request: Request) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");
  if (!code) return NextResponse.json({ error: "Código obrigatório." }, { status: 400 });

  const { error } = await supabaseAdmin.from("coupons").delete().eq("code", code);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ ok: true });
}
