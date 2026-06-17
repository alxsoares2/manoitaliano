"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import OrdersDashboard from "./OrdersDashboard";
import MenuManagement from "./MenuManagement";
import CustomersPanel from "./CustomersPanel";
import CouponsPanel from "./CouponsPanel";
import AdminDashboard from "./AdminDashboard";
import AdminReports from "./AdminReports";

type Tab = "pedidos" | "cardapio" | "clientes" | "cupons" | "dashboard" | "relatorios";

export default function AdminPanel() {
  const router = useRouter();
  const [tab, setTab] = useState<Tab>("pedidos");

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.replace("/admin/login");
  };

  return (
    <main className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground sm:text-3xl">
            Painel Basílico
          </h1>
          <p className="text-sm text-muted">
            {tab === "pedidos"
              ? "Atualização em tempo real — mais recentes no topo"
              : tab === "cardapio"
                ? "Gerencie os itens exibidos no cardápio do cliente"
                : tab === "clientes"
                  ? "Clientes ordenados por total gasto"
                  : tab === "cupons"
                    ? "Crie e gerencie cupons de desconto"
                    : tab === "dashboard"
                      ? "Métricas e desempenho em tempo real"
                      : "Consulte e exporte pedidos por período"}
          </p>
        </div>
        <button
          onClick={handleLogout}
          className="rounded-full border border-border bg-background-elevated px-4 py-2 text-sm text-muted shadow-sm transition hover:border-gold hover:text-gold"
        >
          Sair
        </button>
      </div>

      <div className="mb-6 flex gap-2">
        <button
          onClick={() => setTab("pedidos")}
          className={`rounded-full px-5 py-2 text-sm font-semibold transition ${
            tab === "pedidos"
              ? "bg-gold text-white"
              : "border border-border bg-background-elevated text-muted hover:border-gold hover:text-gold"
          }`}
        >
          Pedidos
        </button>
        <button
          onClick={() => setTab("cardapio")}
          className={`rounded-full px-5 py-2 text-sm font-semibold transition ${
            tab === "cardapio"
              ? "bg-gold text-white"
              : "border border-border bg-background-elevated text-muted hover:border-gold hover:text-gold"
          }`}
        >
          Gestão de Cardápio
        </button>
        <button
          onClick={() => setTab("clientes")}
          className={`rounded-full px-5 py-2 text-sm font-semibold transition ${
            tab === "clientes"
              ? "bg-gold text-white"
              : "border border-border bg-background-elevated text-muted hover:border-gold hover:text-gold"
          }`}
        >
          Clientes
        </button>
        <button
          onClick={() => setTab("cupons")}
          className={`rounded-full px-5 py-2 text-sm font-semibold transition ${
            tab === "cupons"
              ? "bg-gold text-white"
              : "border border-border bg-background-elevated text-muted hover:border-gold hover:text-gold"
          }`}
        >
          Cupons
        </button>
        <button
          onClick={() => setTab("dashboard")}
          className={`rounded-full px-5 py-2 text-sm font-semibold transition ${
            tab === "dashboard"
              ? "bg-gold text-white"
              : "border border-border bg-background-elevated text-muted hover:border-gold hover:text-gold"
          }`}
        >
          Dashboard
        </button>
        <button
          onClick={() => setTab("relatorios")}
          className={`rounded-full px-5 py-2 text-sm font-semibold transition ${
            tab === "relatorios"
              ? "bg-gold text-white"
              : "border border-border bg-background-elevated text-muted hover:border-gold hover:text-gold"
          }`}
        >
          Relatórios
        </button>
      </div>

      {tab === "pedidos" ? (
        <OrdersDashboard />
      ) : tab === "cardapio" ? (
        <MenuManagement />
      ) : tab === "clientes" ? (
        <CustomersPanel />
      ) : tab === "cupons" ? (
        <CouponsPanel />
      ) : tab === "dashboard" ? (
        <AdminDashboard />
      ) : (
        <AdminReports />
      )}
    </main>
  );
}
