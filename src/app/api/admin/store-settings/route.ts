import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { getSessionUser } from "@/lib/adminAuth";

export async function GET() {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

  const { data, error } = await supabaseAdmin.from("store_settings").select("key, value");
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const settings: Record<string, string> = {};
  for (const row of data ?? []) settings[row.key] = row.value;
  return NextResponse.json({ settings });
}

export async function PATCH(request: Request) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  if (user.role === "operador") return NextResponse.json({ error: "Sem permissão" }, { status: 403 });

  const body = await request.json();
  const updates = Object.entries(body as Record<string, string>);

  await Promise.all(
    updates.map(([key, value]) =>
      supabaseAdmin
        .from("store_settings")
        .upsert({ key, value: String(value) }, { onConflict: "key" })
    )
  );

  return NextResponse.json({ ok: true });
}
