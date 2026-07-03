import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/lib/adminAuth";
import { supabaseAdmin } from "@/lib/supabase-admin";

export async function GET(req: NextRequest) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  if (user.role !== "admin") return NextResponse.json({ error: "Acesso restrito a administradores" }, { status: 403 });

  const { searchParams } = new URL(req.url);
  const limit = Math.min(Number(searchParams.get("limit") ?? "100"), 500);
  const offset = Number(searchParams.get("offset") ?? "0");
  const resource = searchParams.get("resource");
  const action = searchParams.get("action");
  const userId = searchParams.get("user_id");

  let query = supabaseAdmin
    .from("admin_audit_logs")
    .select("*", { count: "exact" })
    .order("created_at", { ascending: false })
    .range(offset, offset + limit - 1);

  if (resource) query = query.eq("resource", resource);
  if (action) query = query.eq("action", action);
  if (userId) query = query.eq("user_id", userId);

  const { data, error, count } = await query;

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ logs: data ?? [], total: count ?? 0 });
}
