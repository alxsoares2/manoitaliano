"use client";

import { useEffect, useState, useCallback } from "react";
import { AuditLogRecord, AuditAction, AuditResource } from "@/lib/auditLog";

const ACTION_LABELS: Record<AuditAction, string> = {
  LOGIN:  "Login",
  LOGOUT: "Logout",
  VIEW:   "Visualizou",
  CREATE: "Criou",
  UPDATE: "Editou",
  DELETE: "Excluiu",
};

const ACTION_COLORS: Record<AuditAction, string> = {
  LOGIN:  "bg-blue-100 text-blue-700",
  LOGOUT: "bg-gray-100 text-gray-600",
  VIEW:   "bg-gray-100 text-gray-500",
  CREATE: "bg-green-100 text-green-700",
  UPDATE: "bg-yellow-100 text-yellow-700",
  DELETE: "bg-red-100 text-red-600",
};

const RESOURCE_LABELS: Record<string, string> = {
  menu_items:       "Cardápio",
  menu_categories:  "Categorias",
  combos:           "Combos",
  users:            "Usuários",
  store_settings:   "Configurações",
  business_hours:   "Horários",
  delivery_zones:   "Zonas de entrega",
  coupons:          "Cupons",
  crm:              "CRM",
  orders:           "Pedidos",
  upload:           "Upload",
};

const ALL_ACTIONS: AuditAction[] = ["LOGIN", "LOGOUT", "CREATE", "UPDATE", "DELETE"];
const ALL_RESOURCES: AuditResource[] = [
  "menu_items", "menu_categories", "combos", "users",
  "store_settings", "business_hours", "delivery_zones", "coupons",
];

function formatDate(iso: string) {
  return new Date(iso).toLocaleString("pt-BR", {
    day: "2-digit", month: "2-digit", year: "numeric",
    hour: "2-digit", minute: "2-digit", second: "2-digit",
  });
}

export default function AuditLogsPanel() {
  const [logs, setLogs] = useState<AuditLogRecord[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<string | null>(null);

  const [filterAction, setFilterAction] = useState("");
  const [filterResource, setFilterResource] = useState("");
  const [offset, setOffset] = useState(0);
  const LIMIT = 50;

  const fetchLogs = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams({ limit: String(LIMIT), offset: String(offset) });
    if (filterAction) params.set("action", filterAction);
    if (filterResource) params.set("resource", filterResource);

    const res = await fetch(`/api/admin/audit-logs?${params}`);
    if (res.ok) {
      const data = await res.json();
      setLogs(data.logs ?? []);
      setTotal(data.total ?? 0);
    }
    setLoading(false);
  }, [offset, filterAction, filterResource]);

  useEffect(() => { fetchLogs(); }, [fetchLogs]);

  const handleFilterChange = () => {
    setOffset(0);
    fetchLogs();
  };

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <h2 className="text-lg font-semibold text-foreground">Logs de Auditoria</h2>
        <span className="text-xs text-muted">{total} registro(s)</span>
        <div className="ml-auto flex flex-wrap gap-2">
          <select
            value={filterAction}
            onChange={(e) => { setFilterAction(e.target.value); setOffset(0); }}
            className="rounded-lg border border-border bg-background-elevated px-3 py-1.5 text-xs text-foreground outline-none focus:border-gold"
          >
            <option value="">Todas as ações</option>
            {ALL_ACTIONS.map((a) => (
              <option key={a} value={a}>{ACTION_LABELS[a]}</option>
            ))}
          </select>
          <select
            value={filterResource}
            onChange={(e) => { setFilterResource(e.target.value); setOffset(0); }}
            className="rounded-lg border border-border bg-background-elevated px-3 py-1.5 text-xs text-foreground outline-none focus:border-gold"
          >
            <option value="">Todos os módulos</option>
            {ALL_RESOURCES.map((r) => (
              <option key={r} value={r}>{RESOURCE_LABELS[r] ?? r}</option>
            ))}
          </select>
          <button
            onClick={fetchLogs}
            className="rounded-lg border border-border bg-background-elevated px-3 py-1.5 text-xs text-muted transition hover:border-gold hover:text-gold"
          >
            Atualizar
          </button>
        </div>
      </div>

      {loading ? (
        <p className="text-sm text-muted">Carregando logs...</p>
      ) : logs.length === 0 ? (
        <p className="text-sm text-muted">Nenhum registro encontrado.</p>
      ) : (
        <div className="space-y-1.5">
          {logs.map((log) => (
            <div
              key={log.id}
              className="rounded-xl border border-border bg-background-elevated transition hover:border-foreground/20"
            >
              <button
                className="w-full px-4 py-3 text-left"
                onClick={() => setExpanded(expanded === log.id ? null : log.id)}
              >
                <div className="flex flex-wrap items-center gap-2">
                  <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${ACTION_COLORS[log.action] ?? "bg-gray-100 text-gray-600"}`}>
                    {ACTION_LABELS[log.action] ?? log.action}
                  </span>
                  <span className="text-xs font-medium text-foreground">
                    {RESOURCE_LABELS[log.resource] ?? log.resource}
                  </span>
                  {log.resource_id && (
                    <span className="font-mono text-xs text-muted truncate max-w-[120px]">
                      #{log.resource_id.slice(0, 8)}
                    </span>
                  )}
                  <span className="ml-auto text-xs text-muted">{formatDate(log.created_at)}</span>
                </div>
                <div className="mt-1 flex flex-wrap items-center gap-2">
                  <span className="text-xs font-medium text-foreground">{log.user_name}</span>
                  <span className="text-xs text-muted">{log.user_email}</span>
                  <span className="rounded-full border border-border px-1.5 py-0.5 text-[10px] text-muted">
                    {log.user_role}
                  </span>
                  {log.ip && (
                    <span className="font-mono text-xs text-muted">{log.ip}</span>
                  )}
                </div>
              </button>

              {expanded === log.id && log.details && (
                <div className="border-t border-border px-4 py-3">
                  <p className="mb-1.5 text-xs font-semibold uppercase tracking-widest text-muted">Detalhes</p>
                  <pre className="overflow-x-auto rounded-lg bg-background px-3 py-2 text-xs text-foreground">
                    {JSON.stringify(log.details, null, 2)}
                  </pre>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Paginação */}
      {total > LIMIT && (
        <div className="mt-4 flex items-center justify-between">
          <span className="text-xs text-muted">
            Mostrando {offset + 1}–{Math.min(offset + LIMIT, total)} de {total}
          </span>
          <div className="flex gap-2">
            <button
              disabled={offset === 0}
              onClick={() => setOffset((o) => Math.max(0, o - LIMIT))}
              className="rounded-lg border border-border px-3 py-1.5 text-xs font-semibold text-muted transition hover:border-gold hover:text-gold disabled:cursor-not-allowed disabled:opacity-40"
            >
              Anterior
            </button>
            <button
              disabled={offset + LIMIT >= total}
              onClick={() => setOffset((o) => o + LIMIT)}
              className="rounded-lg border border-border px-3 py-1.5 text-xs font-semibold text-muted transition hover:border-gold hover:text-gold disabled:cursor-not-allowed disabled:opacity-40"
            >
              Próxima
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
