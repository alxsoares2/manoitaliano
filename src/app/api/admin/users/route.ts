import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { getSessionUser, dbListUsers, dbCreateUser, AdminRole } from "@/lib/adminAuth";

export async function GET() {
  const session = await getSessionUser();
  if (!session || session.role !== "admin") {
    return NextResponse.json({ error: "Acesso negado." }, { status: 403 });
  }

  const users = await dbListUsers();
  return NextResponse.json({ users });
}

export async function POST(request: Request) {
  const session = await getSessionUser();
  if (!session || session.role !== "admin") {
    return NextResponse.json({ error: "Acesso negado." }, { status: 403 });
  }

  const { email, password, name, role } = await request.json();

  if (!email || !password || !name || !role) {
    return NextResponse.json({ error: "Todos os campos são obrigatórios." }, { status: 400 });
  }

  const validRoles: AdminRole[] = ["admin", "gerente", "operador"];
  if (!validRoles.includes(role)) {
    return NextResponse.json({ error: "Cargo inválido." }, { status: 400 });
  }

  if (password.length < 8) {
    return NextResponse.json({ error: "Senha deve ter ao menos 8 caracteres." }, { status: 400 });
  }

  const passwordHash = await bcrypt.hash(password, 10);
  const { data, error } = await dbCreateUser(email, passwordHash, name, role);

  if (error) {
    const msg = error.message?.includes("unique") ? "E-mail já cadastrado." : "Erro ao criar usuário.";
    return NextResponse.json({ error: msg }, { status: 422 });
  }

  return NextResponse.json({ ok: true, id: data?.id });
}
