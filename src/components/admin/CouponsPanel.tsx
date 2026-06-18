"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { CouponRecord } from "@/types/coupon";
import { formatPrice } from "@/lib/format";
import { printCoupon } from "@/lib/printCoupon";

const emptyForm = {
  code: "",
  type: "percent" as "percent" | "fixed",
  value: "",
  max_uses: "",
  max_uses_per_customer: "",
  valid_until: "",
};

export default function CouponsPanel() {
  const [coupons, setCoupons] = useState<CouponRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<CouponRecord | null>(null);

  const fetchCoupons = () =>
    supabase
      .from("coupons")
      .select("*")
      .order("created_at", { ascending: false })
      .then(({ data }) => {
        if (data) setCoupons(data as CouponRecord[]);
        setLoading(false);
      });

  useEffect(() => {
    fetchCoupons();
    const channel = supabase
      .channel("coupons-admin-changes")
      .on("postgres_changes", { event: "*", schema: "public", table: "coupons" }, () =>
        fetchCoupons()
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const handleSave = async () => {
    if (!form.code.trim()) { setFormError("Informe o código."); return; }
    if (!form.value || Number(form.value) <= 0) { setFormError("Informe um valor válido."); return; }
    setSaving(true);
    setFormError(null);
    const res = await fetch("/api/admin/coupons", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...form, active: true }),
    });
    setSaving(false);
    if (!res.ok) {
      const data = await res.json();
      setFormError(data.error ?? "Erro ao salvar cupom.");
      return;
    }
    setForm(emptyForm);
    setShowForm(false);
    fetchCoupons();
  };

  const toggleActive = async (c: CouponRecord) => {
    setCoupons((prev) => prev.map((x) => x.code === c.code ? { ...x, active: !x.active } : x));
    await fetch("/api/admin/coupons", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        code: c.code, type: c.type, value: c.value,
        max_uses: c.max_uses, max_uses_per_customer: c.max_uses_per_customer,
        valid_until: c.valid_until, active: !c.active,
      }),
    });
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    await fetch(`/api/admin/coupons?code=${encodeURIComponent(deleteTarget.code)}`, { method: "DELETE" });
    setCoupons((prev) => prev.filter((x) => x.code !== deleteTarget.code));
    setDeleteTarget(null);
  };

  const valueLabel = (c: CouponRecord) =>
    c.type === "percent" ? `${c.value}%` : formatPrice(c.value);

  const isExpired = (c: CouponRecord) =>
    c.valid_until != null && new Date(c.valid_until) < new Date();

  const update = (field: keyof typeof form, v: string) =>
    setForm((p) => ({ ...p, [field]: v }));

  const inputClass = "w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground outline-none focus:border-gold";
  const labelClass = "mb-1 block text-xs font-semibold uppercase tracking-widest text-muted";

  return (
    <>
      <div className="mb-4 flex items-center justify-between">
        <p className="text-sm text-muted">{coupons.length} cupom(ns) cadastrado(s)</p>
        <button
          onClick={() => { setShowForm(true); setForm(emptyForm); setFormError(null); }}
          className="rounded-full bg-gold px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-gold-soft"
        >
          + Novo cupom
        </button>
      </div>

      {loading ? (
        <p className="text-center text-sm text-muted">Carregando cupons...</p>
      ) : coupons.length === 0 ? (
        <p className="text-center text-sm text-muted">Nenhum cupom cadastrado ainda.</p>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-border bg-background-elevated shadow-sm">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-border text-xs uppercase tracking-widest text-muted">
                <th className="px-4 py-3">Código</th>
                <th className="px-4 py-3">Desconto</th>
                <th className="px-4 py-3">Usos</th>
                <th className="px-4 py-3">Por cliente</th>
                <th className="px-4 py-3">Validade</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {coupons.map((c) => (
                <tr key={c.code} className="border-b border-border last:border-b-0">
                  <td className="px-4 py-3 font-semibold text-foreground">{c.code}</td>
                  <td className="px-4 py-3 text-gold">{valueLabel(c)}</td>
                  <td className="px-4 py-3 text-muted">
                    {c.uses_count}{c.max_uses != null ? ` / ${c.max_uses}` : " / ∞"}
                  </td>
                  <td className="px-4 py-3 text-muted">{c.max_uses_per_customer ?? "∞"}</td>
                  <td className="px-4 py-3 text-muted">
                    {c.valid_until ? new Date(c.valid_until).toLocaleDateString("pt-BR") : "—"}
                  </td>
                  <td className="px-4 py-3">
                    {isExpired(c) ? (
                      <span className="rounded-full bg-orange-100 px-2.5 py-1 text-xs font-medium text-orange-700">Expirado</span>
                    ) : (
                      <button
                        onClick={() => toggleActive(c)}
                        className={`rounded-full px-2.5 py-1 text-xs font-medium transition ${
                          c.active ? "bg-green-100 text-green-700 hover:bg-green-200" : "bg-gray-100 text-gray-500 hover:bg-gray-200"
                        }`}
                      >
                        {c.active ? "Ativo" : "Inativo"}
                      </button>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => { printCoupon(c).catch(console.error); }}
                        className="rounded-lg p-1.5 text-muted transition hover:bg-gold/10 hover:text-gold"
                        aria-label="Imprimir cupom"
                        title="Imprimir cupom"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-4 w-4">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M6 9V2h12v7M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" />
                          <rect x="6" y="14" width="12" height="8" rx="1" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                      </button>
                      <button
                        onClick={() => setDeleteTarget(c)}
                        className="rounded-lg p-1.5 text-muted transition hover:bg-red-50 hover:text-red-500"
                        aria-label="Excluir cupom"
                        title="Excluir cupom"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-4 w-4">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6" />
                        </svg>
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal novo cupom */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md rounded-2xl bg-background-elevated p-6 shadow-xl">
            <h3 className="mb-5 text-lg font-semibold text-foreground">Novo cupom</h3>
            <div className="space-y-3">
              <div>
                <label className={labelClass}>Código *</label>
                <input type="text" value={form.code} onChange={(e) => update("code", e.target.value.toUpperCase())} placeholder="BEMVINDO10" className={inputClass} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={labelClass}>Tipo</label>
                  <select value={form.type} onChange={(e) => update("type", e.target.value)} className={inputClass}>
                    <option value="percent">Percentual (%)</option>
                    <option value="fixed">Valor fixo (R$)</option>
                  </select>
                </div>
                <div>
                  <label className={labelClass}>{form.type === "percent" ? "Percentual" : "Valor (R$)"} *</label>
                  <input type="number" inputMode="decimal" value={form.value} onChange={(e) => update("value", e.target.value)} placeholder={form.type === "percent" ? "10" : "15.00"} className={inputClass} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={labelClass}>Limite total</label>
                  <input type="number" inputMode="numeric" value={form.max_uses} onChange={(e) => update("max_uses", e.target.value)} placeholder="Ilimitado" className={inputClass} />
                </div>
                <div>
                  <label className={labelClass}>Limite por cliente</label>
                  <input type="number" inputMode="numeric" value={form.max_uses_per_customer} onChange={(e) => update("max_uses_per_customer", e.target.value)} placeholder="Ilimitado" className={inputClass} />
                </div>
              </div>
              <div>
                <label className={labelClass}>Válido até (opcional)</label>
                <input type="date" value={form.valid_until} onChange={(e) => update("valid_until", e.target.value)} className={inputClass} />
              </div>
              {formError && <p className="text-xs text-red-500">{formError}</p>}
            </div>
            <div className="mt-5 flex gap-3">
              <button onClick={() => setShowForm(false)} className="flex-1 rounded-xl border border-border py-2.5 text-sm font-medium text-muted transition hover:border-foreground hover:text-foreground">
                Cancelar
              </button>
              <button onClick={handleSave} disabled={saving} className="flex-1 rounded-xl bg-gold py-2.5 text-sm font-semibold text-white transition hover:bg-gold-soft disabled:opacity-60">
                {saving ? "Salvando..." : "Criar cupom"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal confirmar exclusão */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-sm rounded-2xl bg-background-elevated p-6 shadow-xl">
            <h3 className="mb-2 text-lg font-semibold text-foreground">Excluir cupom?</h3>
            <p className="mb-5 text-sm text-muted">
              Tem certeza que deseja excluir o cupom <span className="font-medium text-foreground">{deleteTarget.code}</span>? Esta ação não pode ser desfeita.
            </p>
            <div className="flex gap-3">
              <button onClick={() => setDeleteTarget(null)} className="flex-1 rounded-xl border border-border py-2.5 text-sm font-medium text-muted transition hover:border-foreground hover:text-foreground">
                Cancelar
              </button>
              <button onClick={handleDelete} className="flex-1 rounded-xl bg-red-600 py-2.5 text-sm font-semibold text-white transition hover:bg-red-700">
                Excluir
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
