import { NextResponse } from "next/server";
import { supabaseAdmin as supabase } from "@/lib/supabase-admin";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const phone = searchParams.get("phone")?.replace(/\D/g, "");

  if (!phone || phone.length < 10) {
    return NextResponse.json({ customer: null });
  }

  const { data } = await supabase
    .from("customers")
    .select("name, cep, address, number, neighborhood, complement, reference")
    .eq("phone", phone)
    .maybeSingle();

  return NextResponse.json({ customer: data ?? null });
}
