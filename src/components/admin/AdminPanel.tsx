"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAdminAuth } from "@/context/AdminAuthContext";
import OrdersDashboard from "./OrdersDashboard";
import MenuManagement from "./MenuManagement";
import CustomersPanel from "./CustomersPanel";
import CouponsPanel from "./CouponsPanel";
import CrmPanel from "./CrmPanel";
import AdminDashboard from "./AdminDashboard";
import AdminReports from "./AdminReports";
import UsersPanel from "./UsersPanel";
import { AdminRole } from "@/lib/adminAuth";

type Tab = "pedidos" | "cardapio" | "clientes" | "cupons" | "crm" | "dashboard" | "relatorios" | "usuarios";

type TabDef = { id: Tab; label: string; roles: AdminRole[] };

const TABS: TabDef[] = [
  { id: "pedidos",    label: "Pedidos",           roles: ["admin", "gerente", "operador"] },
  { id: "cardapio",   label: "Gestão de Cardápio", roles: ["admin", "gerente"] },
  { id: "clientes",   label: "Clientes",           roles: ["admin", "gerente"] },
  { id: "cupons",     label: "Cupons",             roles: ["admin", "gerente"] },
  { id: "crm",        label: "CRM",                roles: ["admin", "gerente"] },
  { id: "dashboard",  label: "Dashboard",          roles: ["admin", "gerente"] },
  { id: "relatorios", label: "Relatórios",         roles: ["admin", "gerente"] },
  { id: "usuarios",   label: "Usuários",           roles: ["admin"] },
];

const TAB_SUBTITLES: Record<Tab, string> = {
  pedidos:    "Atualização em tempo real — mais recentes no topo",
  cardapio:   "Gerencie os itens exibidos no cardápio do cliente",
  clientes:   "Clientes ordenados por total gasto",
  cupons:     "Crie e gerencie cupons de desconto",
  crm:        "Dispare campanhas de WhatsApp por segmento",
  dashboard:  "Métricas e desempenho em tempo real",
  relatorios: "Consulte e exporte pedidos por período",
  usuarios:   "Gerencie usuários e permissões de acesso",
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

  // Garante que a tab atual é visível para o papel do usuário
  const activeTab = visibleTabs.find((t) => t.id === tab) ? tab : visibleTabs[0]?.id ?? "pedidos";

  return (
    <main className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground sm:text-3xl">Painel Basílico</h1>
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

      {activeTab === "pedidos"    && <OrdersDashboard />}
      {activeTab === "cardapio"   && <MenuManagement />}
      {activeTab === "clientes"   && <CustomersPanel />}
      {activeTab === "cupons"     && <CouponsPanel />}
      {activeTab === "crm"        && <CrmPanel />}
      {activeTab === "dashboard"  && <AdminDashboard />}
      {activeTab === "relatorios" && <AdminReports />}
      {activeTab === "usuarios"   && <UsersPanel />}
    </main>
  );
}
