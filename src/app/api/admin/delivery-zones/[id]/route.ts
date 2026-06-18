import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { getSessionUser } from "@/lib/adminAuth";

function roundTo99(value: number): number {
  return Math.floor(value) + 0.99;
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  if (user.role === "operador") return NextResponse.json({ error: "Sem permissão" }, { status: 403 });

  const { id } = await params;
  const body = await request.json();
  const update: Record<string, unknown> = {};

  if (body.neighborhood !== undefined) update.neighborhood = body.neighborhood.trim();
  if (body.delivery_fee !== undefined) update.delivery_fee = roundTo99(Number(body.delivery_fee));
  if (body.estimated_time !== undefined) update.estimated_time = body.estimated_time;
  if (body.active !== undefined) update.active = body.active;

  const { data, error } = await supabaseAdmin
    .from("delivery_zones")
    .update(update)
    .eq("id", id)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ zone: data });
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  if (user.role === "operador") return NextResponse.json({ error: "Sem permissão" }, { status: 403 });

  const { id } = await params;
  const { error } = await supabaseAdmin.from("delivery_zones").delete().eq("id", id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
