import crypto from "crypto";
import { cookies } from "next/headers";
import { supabaseAdmin as supabase } from "./supabase-admin";

const COOKIE = "basilico_admin_sess";
const SECRET = process.env.ADMIN_JWT_SECRET ?? "fallback-secret-change-me";
const TTL_MS = 8 * 60 * 60 * 1000; // 8 horas

export type AdminRole = "admin" | "gerente" | "operador";

export type AdminUser = {
  id: string;
  email: string;
  name: string;
  role: AdminRole;
};

// ── Token helpers ────────────────────────────────────────────────────────────

function sign(payload: object): string {
  const data = Buffer.from(JSON.stringify({ ...payload, exp: Date.now() + TTL_MS })).toString(
    "base64url"
  );
  const sig = crypto.createHmac("sha256", SECRET).update(data).digest("base64url");
  return `${data}.${sig}`;
}

type VerifyResult =
  | { ok: true; payload: AdminUser & { exp: number } }
  | { ok: false; reason: "expired" | "invalid" };

function verify(token: string): VerifyResult {
  const dot = token.lastIndexOf(".");
  if (dot === -1) return { ok: false, reason: "invalid" };
  const data = token.slice(0, dot);
  const sig = token.slice(dot + 1);
  const expected = crypto.createHmac("sha256", SECRET).update(data).digest("base64url");
  try {
    if (!crypto.timingSafeEqual(Buffer.from(sig, "base64url"), Buffer.from(expected, "base64url")))
      return { ok: false, reason: "invalid" };
  } catch {
    return { ok: false, reason: "invalid" };
  }
  const payload = JSON.parse(Buffer.from(data, "base64url").toString()) as AdminUser & {
    exp: number;
  };
  if (Date.now() > payload.exp) return { ok: false, reason: "expired" };
  return { ok: true, payload };
}

// ── Cookie helpers ───────────────────────────────────────────────────────────

export async function setSessionCookie(user: AdminUser) {
  const token = sign(user);
  const cookieStore = await cookies();
  cookieStore.set(COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: TTL_MS / 1000,
  });
}

export async function clearSessionCookie() {
  const cookieStore = await cookies();
  cookieStore.delete(COOKIE);
}

export type SessionResult =
  | { user: AdminUser; error: null }
  | { user: null; error: "no_session" | "expired" | "invalid" };

export async function getSession(): Promise<SessionResult> {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE)?.value;
  if (!token) return { user: null, error: "no_session" };
  const result = verify(token);
  if (!result.ok) return { user: null, error: result.reason };
  const { payload } = result;
  return { user: { id: payload.id, email: payload.email, name: payload.name, role: payload.role }, error: null };
}

export async function getSessionUser(): Promise<AdminUser | null> {
  const { user } = await getSession();
  return user;
}

export const SESSION_ERROR_MESSAGES: Record<string, string> = {
  no_session: "Nenhuma sessão ativa — faça login",
  expired: "Sessão expirada — faça login novamente",
  invalid: "Sessão inválida — faça login novamente",
};

// ── DB helpers ───────────────────────────────────────────────────────────────

export async function dbGetUserByEmail(email: string) {
  const { data } = await supabase
    .from("admin_users")
    .select("id, email, password_hash, name, role, active")
    .eq("email", email.toLowerCase().trim())
    .single();
  return data;
}

export async function dbListUsers() {
  const { data } = await supabase
    .from("admin_users")
    .select("id, email, name, role, active, created_at")
    .order("created_at", { ascending: true });
  return data ?? [];
}

export async function dbCreateUser(
  email: string,
  passwordHash: string,
  name: string,
  role: AdminRole
) {
  const { data, error } = await supabase
    .from("admin_users")
    .insert({ email: email.toLowerCase().trim(), password_hash: passwordHash, name, role })
    .select("id")
    .single();
  return { data, error };
}

export async function dbUpdateUser(
  id: string,
  fields: Partial<{ name: string; role: AdminRole; active: boolean; password_hash: string }>
) {
  const { error } = await supabase.from("admin_users").update(fields).eq("id", id);
  return { error };
}
