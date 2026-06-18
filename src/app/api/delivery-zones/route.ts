import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

export async function GET() {
  const { data, error } = await supabase
    .from("delivery_zones")
    .select("neighborhood, delivery_fee, estimated_time")
    .eq("active", true)
    .order("neighborhood");

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ zones: data ?? [] });
}
