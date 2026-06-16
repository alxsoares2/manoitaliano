"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { CustomerRecord } from "@/types/customer";
import { formatPrice } from "@/lib/format";
import CustomerHistoryPanel from "./CustomerHistoryPanel";

export default function CustomersPanel() {
  const [customers, setCustomers] = useState<CustomerRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<CustomerRecord | null>(null);

  useEffect(() => {
    let active = true;

    const fetchCustomers = () =>
      supabase
        .from("customers")
        .select("*")
        .order("total_spent", { ascending: false })
        .then(({ data }) => {
          if (active && data) setCustomers(data as CustomerRecord[]);
          if (active) setLoading(false);
        });

    fetchCustomers();

    const channel = supabase
      .channel("customers-changes")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "customers" },
        () => fetchCustomers()
      )
      .subscribe();

    return () => {
      active = false;
      supabase.removeChannel(channel);
    };
  }, []);

  const filtered = customers.filter((customer) => {
    const term = search.trim().toLowerCase();
    if (!term) return true;
    return (
      customer.name.toLowerCase().includes(term) ||
      customer.phone.toLowerCase().includes(term)
    );
  });

  return (
    <>
      <div className="mb-6">
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
              </tr>
            </thead>
            <tbody>
              {filtered.map((customer) => {
                const addressParts = [
                  customer.address
                    ? `${customer.address}, ${customer.address_number}`
                    : null,
                  customer.neighborhood,
                ].filter(Boolean);

                return (
                  <tr
                    key={customer.phone}
                    onClick={() => setSelected(customer)}
                    className="cursor-pointer border-b border-border transition last:border-b-0 hover:bg-background"
                  >
                    <td className="px-4 py-3 font-semibold text-foreground">{customer.name}</td>
                    <td className="px-4 py-3 text-muted">{customer.phone}</td>
                    <td className="px-4 py-3 text-muted">{addressParts.join(" — ") || "—"}</td>
                    <td className="px-4 py-3 font-semibold text-gold">
                      {formatPrice(customer.total_spent)}
                    </td>
                    <td className="px-4 py-3 text-muted">{customer.orders_count}</td>
                    <td className="px-4 py-3 text-muted">
                      {new Date(customer.last_order_at).toLocaleDateString("pt-BR")}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {selected && (
        <CustomerHistoryPanel customer={selected} onClose={() => setSelected(null)} />
      )}
    </>
  );
}
