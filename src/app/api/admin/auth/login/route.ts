import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { dbGetUserByEmail, setSessionCookie } from "@/lib/adminAuth";

export async function POST(request: Request) {
  const { email, password } = await request.json();

  if (!email || !password) {
    return NextResponse.json({ error: "Credenciais obrigatórias." }, { status: 400 });
  }

  const user = await dbGetUserByEmail(email);

  if (!user || !user.active) {
    return NextResponse.json({ error: "E-mail ou senha incorretos." }, { status: 401 });
  }

  const valid = await bcrypt.compare(password, user.password_hash);
  if (!valid) {
    return NextResponse.json({ error: "E-mail ou senha incorretos." }, { status: 401 });
  }

  await setSessionCookie({ id: user.id, email: user.email, name: user.name, role: user.role });

  return NextResponse.json({ ok: true, user: { id: user.id, email: user.email, name: user.name, role: user.role } });
}
