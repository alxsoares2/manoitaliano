import crypto from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { setSessionCookie, AdminRole } from "@/lib/adminAuth";

const SSO_SECRET = process.env.ADMIN_SSO_SECRET;

type SsoPayload = {
  email: string;
  name: string;
  role: AdminRole;
  exp: number;
};

function verifySsoToken(token: string): SsoPayload | null {
  if (!SSO_SECRET) return null;
  const dot = token.lastIndexOf(".");
  if (dot === -1) return null;
  const data = token.slice(0, dot);
  const sig = token.slice(dot + 1);
  const expected = crypto.createHmac("sha256", SSO_SECRET).update(data).digest("base64url");
  try {
    if (!crypto.timingSafeEqual(Buffer.from(sig, "base64url"), Buffer.from(expected, "base64url")))
      return null;
  } catch {
    return null;
  }
  const payload = JSON.parse(Buffer.from(data, "base64url").toString()) as SsoPayload;
  if (Date.now() > payload.exp) return null;
  return payload;
}

// Recebe um token de curta duração assinado pelo Painel Central e, se válido,
// cria uma sessão normal de admin aqui — o usuário nunca digita senha nesta loja.
export async function GET(request: NextRequest) {
  const token = request.nextUrl.searchParams.get("token");
  if (!token) {
    return NextResponse.redirect(new URL("/admin/login", request.url));
  }

  const payload = verifySsoToken(token);
  if (!payload) {
    return NextResponse.redirect(new URL("/admin/login?erro=sso_invalido", request.url));
  }

  await setSessionCookie({
    id: `sso-${payload.email}`,
    email: payload.email,
    name: payload.name,
    role: payload.role,
  });

  return NextResponse.redirect(new URL("/admin", request.url));
}
