import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { getSessionUser } from "@/lib/adminAuth";

function roundTo99(value: number): number {
  return Math.floor(value) + 0.99;
}

export async function GET() {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

  const { data, error } = await supabaseAdmin
    .from("delivery_zones")
    .select("*")
    .order("neighborhood");

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ zones: data ?? [] });
}

export async function POST(request: Request) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  if (user.role === "operador") return NextResponse.json({ error: "Sem permissão" }, { status: 403 });

  const body = await request.json();
  const { neighborhood, delivery_fee, estimated_time } = body;

  if (!neighborhood?.trim()) return NextResponse.json({ error: "Bairro obrigatório" }, { status: 400 });
  if (delivery_fee == null || isNaN(Number(delivery_fee)))
    return NextResponse.json({ error: "Frete inválido" }, { status: 400 });

  const fee = roundTo99(Number(delivery_fee));

  const { data, error } = await supabaseAdmin
    .from("delivery_zones")
    .insert({ neighborhood: neighborhood.trim(), delivery_fee: fee, estimated_time: estimated_time || "40-55 min" })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ zone: data }, { status: 201 });
}
