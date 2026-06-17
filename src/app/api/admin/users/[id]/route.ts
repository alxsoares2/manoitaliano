import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { getSessionUser, dbUpdateUser, AdminRole } from "@/lib/adminAuth";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSessionUser();
  if (!session || session.role !== "admin") {
    return NextResponse.json({ error: "Acesso negado." }, { status: 403 });
  }

  const { id } = await params;
  const body = await request.json();

  // Admin não pode desativar a si mesmo
  if (id === session.id && body.active === false) {
    return NextResponse.json({ error: "Você não pode desativar a sua própria conta." }, { status: 422 });
  }

  const fields: Record<string, unknown> = {};

  if (body.name !== undefined) fields.name = body.name;
  if (body.role !== undefined) {
    const validRoles: AdminRole[] = ["admin", "gerente", "operador"];
    if (!validRoles.includes(body.role)) {
      return NextResponse.json({ error: "Cargo inválido." }, { status: 400 });
    }
    fields.role = body.role;
  }
  if (body.active !== undefined) fields.active = body.active;
  if (body.password) {
    if (body.password.length < 8) {
      return NextResponse.json({ error: "Senha deve ter ao menos 8 caracteres." }, { status: 400 });
    }
    fields.password_hash = await bcrypt.hash(body.password, 10);
  }

  const { error } = await dbUpdateUser(id, fields as Parameters<typeof dbUpdateUser>[1]);

  if (error) {
    return NextResponse.json({ error: "Erro ao atualizar usuário." }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
