"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAdminAuth } from "@/context/AdminAuthContext";
import OrdersDashboard from "./OrdersDashboard";
import MenuManagement from "./MenuManagement";
import CustomersPanel from "./CustomersPanel";
import CrmCuponsPanel from "./CrmCuponsPanel";
import AdminDashboard from "./AdminDashboard";
import AdminReports from "./AdminReports";
import ConfiguracoesPanel from "./ConfiguracoesPanel";
import AuditLogsPanel from "./AuditLogsPanel";
import { AdminRole } from "@/lib/adminAuth";

type Tab = "pedidos" | "cardapio" | "clientes" | "crm" | "dashboard" | "relatorios" | "configuracoes" | "auditoria";

type TabDef = { id: Tab; label: string; roles: AdminRole[] };

const TABS: TabDef[] = [
  { id: "pedidos",       label: "Pedidos",        roles: ["admin", "gerente", "operador"] },
  { id: "cardapio",      label: "Cardápio",        roles: ["admin", "gerente"] },
  { id: "clientes",      label: "Clientes",        roles: ["admin", "gerente"] },
  { id: "crm",           label: "CRM",             roles: ["admin", "gerente"] },
  { id: "dashboard",     label: "Dashboard",       roles: ["admin", "gerente"] },
  { id: "relatorios",    label: "Relatórios",      roles: ["admin", "gerente"] },
  { id: "configuracoes", label: "Configurações",   roles: ["admin", "gerente"] },
  { id: "auditoria",     label: "Auditoria",        roles: ["admin"] },
];

const TAB_SUBTITLES: Record<Tab, string> = {
  pedidos:       "Atualização em tempo real — mais recentes no topo",
  cardapio:      "Gerencie os itens exibidos no cardápio do cliente",
  clientes:      "Clientes ordenados por total gasto",
  crm:           "Campanhas de WhatsApp e cupons de desconto",
  dashboard:     "Métricas e desempenho em tempo real",
  relatorios:    "Consulte e exporte pedidos por período",
  configuracoes: "Horário de funcionamento, zonas de entrega e usuários",
  auditoria:     "Registro de todas as ações administrativas",
};

const ROLE_LABELS: Record<AdminRole, string> = {
  admin: "Admin",
  gerente: "Gerente",
  operador: "Operador",
};

export default function AdminPanel() {
  const router = useRouter();
  const { user, logout } = useAdminAuth();
  const [tab, setTab] = useState<Tab>("pedidos");

  const handleLogout = async () => {
    await logout();
    router.replace("/admin/login");
  };

  const role = user?.role ?? "operador";
  const visibleTabs = TABS.filter((t) => t.roles.includes(role));
  const activeTab = visibleTabs.find((t) => t.id === tab) ? tab : visibleTabs[0]?.id ?? "pedidos";

  return (
    <main className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground sm:text-3xl">Painel Mano Italiano</h1>
          <p className="text-sm text-muted">{TAB_SUBTITLES[activeTab]}</p>
        </div>
        <div className="flex items-center gap-3">
          {user && (
            <div className="hidden sm:flex flex-col items-end leading-tight">
              <span className="text-sm font-medium text-foreground">{user.name}</span>
              <span className="text-xs text-muted">{ROLE_LABELS[user.role]}</span>
            </div>
          )}
          <button
            onClick={handleLogout}
            className="rounded-full border border-border bg-background-elevated px-4 py-2 text-sm text-muted shadow-sm transition hover:border-gold hover:text-gold"
          >
            Sair
          </button>
        </div>
      </div>

      <div className="mb-6 flex flex-wrap gap-2">
        {visibleTabs.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`rounded-full px-5 py-2 text-sm font-semibold transition ${
              activeTab === t.id
                ? "bg-gold text-white"
                : "border border-border bg-background-elevated text-muted hover:border-gold hover:text-gold"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {activeTab === "pedidos"       && <OrdersDashboard />}
      {activeTab === "cardapio"      && <MenuManagement />}
      {activeTab === "clientes"      && <CustomersPanel />}
      {activeTab === "crm"           && <CrmCuponsPanel />}
      {activeTab === "dashboard"     && <AdminDashboard />}
      {activeTab === "relatorios"    && <AdminReports />}
      {activeTab === "configuracoes" && <ConfiguracoesPanel />}
      {activeTab === "auditoria"     && <AuditLogsPanel />}
    </main>
  );
}
