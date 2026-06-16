"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { CustomerRecord } from "@/types/customer";
import { formatPrice } from "@/lib/format";
import CustomerHistoryPanel from "./CustomerHistoryPanel";

const MEDALS = ["🥇", "🥈", "🥉"];
const MEDAL_BG = [
  "bg-yellow-50 border-yellow-200",
  "bg-gray-50 border-gray-200",
  "bg-orange-50 border-orange-200",
];

function formatAddress(c: CustomerRecord) {
  const parts = [
    c.address ? `${c.address}${c.address_number ? `, ${c.address_number}` : ""}` : null,
    c.neighborhood,
    c.cep ? `CEP ${c.cep}` : null,
  ].filter(Boolean);
  return parts.join(" — ") || "—";
}

export default function CustomersPanel() {
  const [customers, setCustomers] = useState<CustomerRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<CustomerRecord | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<CustomerRecord | null>(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    let active = true;

    const fetchCustomers = () =>
      supabase
        .from("customers")
        .select("*")
        .order("last_order_at", { ascending: false })
        .then(({ data }) => {
          if (active && data) setCustomers(data as CustomerRecord[]);
          if (active) setLoading(false);
        });

    fetchCustomers();

    const channel = supabase
      .channel("customers-changes")
      .on("postgres_changes", { event: "*", schema: "public", table: "customers" }, () =>
        fetchCustomers()
      )
      .subscribe();

    return () => {
      active = false;
      supabase.removeChannel(channel);
    };
  }, []);

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    await supabase.from("customers").delete().eq("phone", deleteTarget.phone);
    setCustomers((prev) => prev.filter((c) => c.phone !== deleteTarget.phone));
    setDeleteTarget(null);
    setDeleting(false);
  };

  const filtered = customers.filter((c) => {
    const term = search.trim().toLowerCase();
    if (!term) return true;
    return c.name.toLowerCase().includes(term) || c.phone.includes(term);
  });

  const top3 = [...customers]
    .sort((a, b) => b.orders_count - a.orders_count)
    .slice(0, 3);

  return (
    <>
      {/* Pódio top 3 */}
      {!loading && top3.length > 0 && (
        <div className="mb-8">
          <h3 className="mb-3 text-xs font-semibold uppercase tracking-widest text-muted">
            Top clientes por pedidos
          </h3>
          <div className="grid gap-3 sm:grid-cols-3">
            {top3.map((c, i) => (
              <div
                key={c.phone}
                className={`flex items-center gap-3 rounded-xl border p-4 ${MEDAL_BG[i]}`}
              >
                <span className="text-3xl">{MEDALS[i]}</span>
                <div className="min-w-0">
                  <p className="truncate font-semibold text-foreground">{c.name}</p>
                  <p className="text-xs text-muted">{c.orders_count} pedidos · {formatPrice(c.total_spent)}</p>
                  <p className="text-xs text-muted">{c.phone}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Busca */}
      <div className="mb-4">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar por nome ou telefone..."
          className="w-full max-w-sm rounded-lg border border-border bg-background-elevated px-3 py-2.5 text-sm text-foreground outline-none transition focus:border-gold"
        />
      </div>

      {loading ? (
        <p className="text-center text-sm text-muted">Carregando clientes...</p>
      ) : filtered.length === 0 ? (
        <p className="text-center text-sm text-muted">Nenhum cliente encontrado.</p>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-border bg-background-elevated shadow-sm">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-border text-xs uppercase tracking-widest text-muted">
                <th className="px-4 py-3">Nome</th>
                <th className="px-4 py-3">Telefone</th>
                <th className="px-4 py-3">Endereço</th>
                <th className="px-4 py-3">Total gasto</th>
                <th className="px-4 py-3">Pedidos</th>
                <th className="px-4 py-3">Último pedido</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((c) => (
                <tr
                  key={c.phone}
                  onClick={() => setSelected(c)}
                  className="cursor-pointer border-b border-border transition last:border-b-0 hover:bg-background"
                >
                  <td className="px-4 py-3 font-semibold text-foreground">{c.name}</td>
                  <td className="px-4 py-3 text-muted">{c.phone}</td>
                  <td className="max-w-xs px-4 py-3 text-muted">
                    <span className="block truncate">{formatAddress(c)}</span>
                  </td>
                  <td className="px-4 py-3 font-semibold text-gold">{formatPrice(c.total_spent)}</td>
                  <td className="px-4 py-3 text-muted">{c.orders_count}</td>
                  <td className="px-4 py-3 text-muted">
                    {c.last_order_at
                      ? new Date(c.last_order_at).toLocaleDateString("pt-BR")
                      : "—"}
                  </td>
                  <td className="px-4 py-3">
                    <button
                      onClick={(e) => { e.stopPropagation(); setDeleteTarget(c); }}
                      className="rounded-lg p-1.5 text-muted transition hover:bg-red-50 hover:text-red-500"
                      aria-label="Deletar cliente"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-4 w-4">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6" />
                      </svg>
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal de confirmação de delete */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-sm rounded-2xl bg-background-elevated p-6 shadow-xl">
            <h3 className="mb-2 text-lg font-semibold text-foreground">Deletar cliente?</h3>
            <p className="mb-5 text-sm text-muted">
              Tem certeza que deseja remover <span className="font-medium text-foreground">{deleteTarget.name}</span> da lista de clientes? Esta ação não pode ser desfeita.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setDeleteTarget(null)}
                className="flex-1 rounded-xl border border-border py-2.5 text-sm font-medium text-muted transition hover:border-foreground hover:text-foreground"
              >
                Cancelar
              </button>
              <button
                onClick={handleDelete}
                disabled={deleting}
                className="flex-1 rounded-xl bg-red-600 py-2.5 text-sm font-semibold text-white transition hover:bg-red-700 disabled:opacity-60"
              >
                {deleting ? "Deletando..." : "Deletar"}
              </button>
            </div>
          </div>
        </div>
      )}

      {selected && (
        <CustomerHistoryPanel customer={selected} onClose={() => setSelected(null)} />
      )}
    </>
  );
}
