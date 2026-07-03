import { supabaseAdmin } from "./supabase-admin";
import { AdminUser } from "./adminAuth";
import { NextRequest } from "next/server";

export type AuditAction = "LOGIN" | "LOGOUT" | "VIEW" | "CREATE" | "UPDATE" | "DELETE";

export type AuditResource =
  | "menu_items"
  | "menu_categories"
  | "combos"
  | "users"
  | "store_settings"
  | "business_hours"
  | "delivery_zones"
  | "coupons"
  | "crm"
  | "orders"
  | "upload";

type LogParams = {
  user: AdminUser;
  action: AuditAction;
  resource: AuditResource;
  resourceId?: string | null;
  details?: Record<string, unknown> | null;
  req?: NextRequest | Request;
};

export async function logAudit({
  user,
  action,
  resource,
  resourceId,
  details,
  req,
}: LogParams): Promise<void> {
  const ip = req
    ? (req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
       req.headers.get("x-real-ip") ??
       null)
    : null;

  const { error } = await supabaseAdmin.from("admin_audit_logs").insert({
    user_id: user.id,
    user_email: user.email,
    user_name: user.name,
    user_role: user.role,
    action,
    resource,
    resource_id: resourceId ?? null,
    details: details ?? null,
    ip,
  });

  if (error) {
    console.error("[auditLog] Falha ao registrar:", error.message);
  }
}

export type AuditLogRecord = {
  id: string;
  created_at: string;
  user_id: string | null;
  user_email: string;
  user_name: string;
  user_role: string;
  action: AuditAction;
  resource: AuditResource;
  resource_id: string | null;
  details: Record<string, unknown> | null;
  ip: string | null;
};
