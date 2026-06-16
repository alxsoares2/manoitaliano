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
  const [showAddModal, setShowAddModal] = useState(false);
  const [newCustomer, setNewCustomer] = useState({ name: "", phone: "", cep: "", address: "", address_number: "", neighborhood: "", complement: "", reference: "" });
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [cepLoading, setCepLoading] = useState(false);
  const [cepError, setCepError] = useState<string | null>(null);

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

  const handleCepBlur = async () => {
    const digits = newCustomer.cep.replace(/\D/g, "");
    if (digits.length !== 8) return;
    setCepLoading(true);
    setCepError(null);
    try {
      const res = await fetch(`https://viacep.com.br/ws/${digits}/json/`);
      const data = await res.json();
      if (data.erro) { setCepError("CEP não encontrado"); return; }
      setNewCustomer((p) => ({
        ...p,
        address: data.logradouro || p.address,
        neighborhood: data.bairro || p.neighborhood,
        address_number: "",
      }));
    } catch {
      setCepError("Erro ao buscar CEP");
    } finally {
      setCepLoading(false);
    }
  };

  const handleAddCustomer = async () => {
    if (!newCustomer.name.trim() || !newCustomer.phone.trim()) {
      setSaveError("Nome e telefone são obrigatórios.");
      return;
    }
    setSaving(true);
    setSaveError(null);
    const phone = newCustomer.phone.replace(/\D/g, "");
    const { error } = await supabase.from("customers").upsert(
      { ...newCustomer, phone, updated_at: new Date().toISOString() },
      { onConflict: "phone" }
    );
    setSaving(false);
    if (error) { setSaveError("Erro ao salvar cliente."); return; }
    setShowAddModal(false);
    setNewCustomer({ name: "", phone: "", cep: "", address: "", address_number: "", neighborhood: "", complement: "", reference: "" });
  };

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

      {/* Busca + botão novo */}
      <div className="mb-4 flex items-center gap-3">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar por nome ou telefone..."
          className="w-full max-w-sm rounded-lg border border-border bg-background-elevated px-3 py-2.5 text-sm text-foreground outline-none transition focus:border-gold"
        />
        <button
          onClick={() => { setShowAddModal(true); setSaveError(null); }}
          className="flex shrink-0 items-center gap-2 rounded-lg bg-gold px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-gold-soft"
        >
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-4 w-4">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 5v14M5 12h14" />
          </svg>
          Novo cliente
        </button>
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

      {/* Modal novo cliente */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md rounded-2xl bg-background-elevated p-6 shadow-xl">
            <h3 className="mb-5 text-lg font-semibold text-foreground">Cadastrar cliente</h3>
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1 block text-xs font-semibold uppercase tracking-widest text-muted">Nome *</label>
                  <input type="text" value={newCustomer.name} onChange={(e) => setNewCustomer((p) => ({ ...p, name: e.target.value }))} placeholder="Nome completo" className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground outline-none focus:border-gold" />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-semibold uppercase tracking-widest text-muted">Telefone *</label>
                  <input type="text" value={newCustomer.phone} onChange={(e) => setNewCustomer((p) => ({ ...p, phone: e.target.value }))} placeholder="(83) 99999-9999" className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground outline-none focus:border-gold" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1 block text-xs font-semibold uppercase tracking-widest text-muted">CEP</label>
                  <div className="relative">
                    <input
                      type="text"
                      value={newCustomer.cep}
                      onChange={(e) => { setCepError(null); setNewCustomer((p) => ({ ...p, cep: e.target.value })); }}
                      onBlur={handleCepBlur}
                      placeholder="00000-000"
                      maxLength={9}
                      className={`w-full rounded-lg border bg-background px-3 py-2 text-sm text-foreground outline-none focus:border-gold ${cepError ? "border-red-400" : "border-border"} ${cepLoading ? "pr-8" : ""}`}
                    />
                    {cepLoading && (
                      <div className="absolute right-2.5 top-1/2 -translate-y-1/2">
                        <svg className="h-4 w-4 animate-spin text-muted" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
                        </svg>
                      </div>
                    )}
                  </div>
                  {cepError && <p className="mt-1 text-xs text-red-500">{cepError}</p>}
                </div>
                <div>
                  <label className="mb-1 block text-xs font-semibold uppercase tracking-widest text-muted">Bairro</label>
                  <input type="text" value={newCustomer.neighborhood} onChange={(e) => setNewCustomer((p) => ({ ...p, neighborhood: e.target.value }))} placeholder="Bairro" className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground outline-none focus:border-gold" />
                </div>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div className="col-span-2">
                  <label className="mb-1 block text-xs font-semibold uppercase tracking-widest text-muted">Rua</label>
                  <input type="text" value={newCustomer.address} onChange={(e) => setNewCustomer((p) => ({ ...p, address: e.target.value }))} placeholder="Nome da rua" className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground outline-none focus:border-gold" />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-semibold uppercase tracking-widest text-muted">Número</label>
                  <input type="text" value={newCustomer.address_number} onChange={(e) => setNewCustomer((p) => ({ ...p, address_number: e.target.value }))} placeholder="123" className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground outline-none focus:border-gold" />
                </div>
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold uppercase tracking-widest text-muted">Complemento</label>
                <input type="text" value={newCustomer.complement} onChange={(e) => setNewCustomer((p) => ({ ...p, complement: e.target.value }))} placeholder="Apto, bloco..." className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground outline-none focus:border-gold" />
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold uppercase tracking-widest text-muted">Ponto de referência</label>
                <input type="text" value={newCustomer.reference} onChange={(e) => setNewCustomer((p) => ({ ...p, reference: e.target.value }))} placeholder="Próximo a..." className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground outline-none focus:border-gold" />
              </div>
              {saveError && <p className="text-xs text-red-500">{saveError}</p>}
            </div>
            <div className="mt-5 flex gap-3">
              <button onClick={() => setShowAddModal(false)} className="flex-1 rounded-xl border border-border py-2.5 text-sm font-medium text-muted transition hover:border-foreground hover:text-foreground">
                Cancelar
              </button>
              <button onClick={handleAddCustomer} disabled={saving} className="flex-1 rounded-xl bg-gold py-2.5 text-sm font-semibold text-white transition hover:bg-gold-soft disabled:opacity-60">
                {saving ? "Salvando..." : "Cadastrar"}
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
