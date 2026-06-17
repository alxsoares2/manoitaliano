import { NextResponse } from "next/server";
import { supabaseAdmin as supabase } from "@/lib/supabase-admin";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const phone = searchParams.get("phone")?.replace(/\D/g, "");

  if (!phone || phone.length < 10) {
    return NextResponse.json({ customer: null });
  }

  // RPC compara telefones normalizados (só dígitos), cobrindo tanto registros
  // criados pelo trigger de pedido (telefone formatado) quanto cadastro manual.
  const { data } = await supabase.rpc("lookup_customer", { p_digits: phone });
  const row = Array.isArray(data) ? data[0] : null;

  if (!row) return NextResponse.json({ customer: null });

  return NextResponse.json({
    customer: {
      name: row.name,
      cep: row.cep ?? "",
      address: row.address ?? "",
      number: row.address_number ?? "",
      neighborhood: row.neighborhood ?? "",
      complement: row.complement ?? "",
      reference: row.reference ?? "",
    },
  });
}
