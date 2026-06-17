"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";
import { CustomerRecord } from "@/types/customer";
import { CouponRecord } from "@/types/coupon";
import { formatPrice } from "@/lib/format";

type Segment = "inativos" | "vips" | "recentes" | null;

const DAY = 24 * 60 * 60 * 1000;

export default function CrmPanel() {
  const [customers, setCustomers] = useState<CustomerRecord[]>([]);
  const [coupons, setCoupons] = useState<CouponRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [segment, setSegment] = useState<Segment>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [message, setMessage] = useState("Olá {nome}! 🍕 A Basílico Pizzas preparou algo especial pra você. Use o cupom {cupom} no seu próximo pedido!");
  const [coupon, setCoupon] = useState("");
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState<{ sent: number; failed: number } | null>(null);

  useEffect(() => {
    Promise.all([
      supabase.from("customers").select("*"),
      supabase.from("coupons").select("*").eq("active", true),
    ]).then(([c, cp]) => {
      if (c.data) setCustomers(c.data as CustomerRecord[]);
      if (cp.data) setCoupons(cp.data as CouponRecord[]);
      setLoading(false);
    });
  }, []);

  const now = Date.now();

  const segments = useMemo(() => {
    const inativos = customers.filter(
      (c) => c.last_order_at && now - new Date(c.last_order_at).getTime() > 21 * DAY
    );
    const vips = customers.filter((c) => c.orders_count > 3 || c.total_spent > 300);
    const recentes = customers.filter(
      (c) => c.last_order_at && now - new Date(c.last_order_at).getTime() <= 7 * DAY
    );
    return { inativos, vips, recentes };
  }, [customers, now]);

  const segmentList: CustomerRecord[] =
    segment === "inativos" ? segments.inativos
    : segment === "vips" ? segments.vips
    : segment === "recentes" ? segments.recentes
    : customers;

  const selectSegment = (seg: Segment) => {
    setSegment(seg);
    setResult(null);
    const list =
      seg === "inativos" ? segments.inativos
      : seg === "vips" ? segments.vips
      : seg === "recentes" ? segments.recentes
      : [];
    setSelected(new Set(list.map((c) => c.phone)));
  };

  const toggle = (phone: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(phone)) next.delete(phone);
      else next.add(phone);
      return next;
    });
  };

  const handleSend = async () => {
    const recipients = customers
      .filter((c) => selected.has(c.phone))
      .map((c) => ({ phone: c.phone, name: c.name }));
    if (recipients.length === 0 || !message.trim()) return;

    setSending(true);
    setResult(null);
    try {
      const res = await fetch("/api/admin/crm/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ recipients, message, coupon }),
      });
      const data = await res.json();
      if (res.ok) setResult({ sent: data.sent, failed: data.failed });
      else setResult({ sent: 0, failed: recipients.length });
    } catch {
      setResult({ sent: 0, failed: recipients.length });
    } finally {
      setSending(false);
    }
  };

  const segCard = (key: Segment, label: string, count: number, desc: string) => (
    <button
      onClick={() => selectSegment(key)}
      className={`flex flex-col gap-1 rounded-xl border p-4 text-left transition ${
        segment === key ? "border-gold bg-gold/5" : "border-border bg-background-elevated hover:border-gold/40"
      }`}
    >
      <span className="text-2xl font-bold text-foreground">{count}</span>
      <span className="text-sm font-semibold text-foreground">{label}</span>
      <span className="text-xs text-muted">{desc}</span>
    </button>
  );

  if (loading) return <p className="text-center text-sm text-muted">Carregando clientes...</p>;

  const previewName = customers.find((c) => selected.has(c.phone))?.name.split(" ")[0] ?? "Cliente";
  const preview = message.replaceAll("{nome}", previewName).replaceAll("{cupom}", coupon || "CUPOM");

  return (
    <div className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
      {/* Coluna esquerda: segmentos + lista */}
      <div>
        <div className="mb-4 grid grid-cols-3 gap-3">
          {segCard("inativos", "Inativos", segments.inativos.length, "Sem pedido há +21 dias")}
          {segCard("vips", "VIPs", segments.vips.length, "+3 pedidos ou +R$300")}
          {segCard("recentes", "Recentes", segments.recentes.length, "Pediram nos últimos 7 dias")}
        </div>

        <div className="mb-2 flex items-center justify-between">
          <p className="text-sm text-muted">
            {selected.size} selecionado(s){segment ? "" : " · todos os clientes"}
          </p>
          <button
            onClick={() => { setSegment(null); setSelected(new Set()); setResult(null); }}
            className="text-xs text-muted underline transition hover:text-foreground"
          >
            Limpar seleção
          </button>
        </div>

        <div className="max-h-[420px] overflow-y-auto rounded-xl border border-border bg-background-elevated">
          {segmentList.length === 0 ? (
            <p className="p-4 text-center text-sm text-muted">Nenhum cliente neste segmento.</p>
          ) : (
            <ul className="divide-y divide-border">
              {segmentList.map((c) => (
                <li key={c.phone}>
                  <label className="flex cursor-pointer items-center gap-3 px-4 py-2.5 transition hover:bg-background">
                    <input
                      type="checkbox"
                      checked={selected.has(c.phone)}
                      onChange={() => toggle(c.phone)}
                      className="h-4 w-4 accent-[var(--gold)]"
                    />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-foreground">{c.name}</p>
                      <p className="text-xs text-muted">{c.phone}</p>
                    </div>
                    <span className="shrink-0 text-xs text-muted">
                      {c.orders_count} ped. · {formatPrice(c.total_spent)}
                    </span>
                  </label>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {/* Coluna direita: mensagem */}
      <div className="flex flex-col gap-4">
        <div>
          <label className="mb-1 block text-xs font-semibold uppercase tracking-widest text-muted">Cupom (opcional)</label>
          {coupons.length > 0 ? (
            <select
              value={coupon}
              onChange={(e) => setCoupon(e.target.value)}
              className="w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm text-foreground outline-none focus:border-gold"
            >
              <option value="">Sem cupom</option>
              {coupons.map((c) => (
                <option key={c.code} value={c.code}>
                  {c.code} ({c.type === "percent" ? `${c.value}%` : formatPrice(c.value)})
                </option>
              ))}
            </select>
          ) : (
            <input
              type="text"
              value={coupon}
              onChange={(e) => setCoupon(e.target.value.toUpperCase())}
              placeholder="Código do cupom"
              className="w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm text-foreground outline-none focus:border-gold"
            />
          )}
        </div>

        <div>
          <label className="mb-1 block text-xs font-semibold uppercase tracking-widest text-muted">Mensagem</label>
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            rows={6}
            className="w-full resize-none rounded-lg border border-border bg-background px-3 py-2.5 text-sm text-foreground outline-none focus:border-gold"
          />
          <p className="mt-1 text-xs text-muted">
            Use <code className="rounded bg-background px-1 text-foreground">{"{nome}"}</code> e{" "}
            <code className="rounded bg-background px-1 text-foreground">{"{cupom}"}</code> para personalizar.
          </p>
        </div>

        <div className="rounded-lg border border-border bg-background p-3">
          <p className="mb-1 text-xs font-semibold uppercase tracking-widest text-muted">Prévia</p>
          <p className="whitespace-pre-wrap text-sm text-foreground">{preview}</p>
        </div>

        {result && (
          <div className={`rounded-lg border p-3 text-sm ${result.failed === 0 ? "border-green-200 bg-green-50 text-green-700" : "border-orange-200 bg-orange-50 text-orange-700"}`}>
            ✅ {result.sent} mensagem(ns) enviada(s) com sucesso
            {result.failed > 0 && <> · ⚠️ {result.failed} falha(s)</>}
          </div>
        )}

        <button
          onClick={handleSend}
          disabled={sending || selected.size === 0 || !message.trim()}
          className="rounded-xl bg-gold px-5 py-3.5 font-semibold text-white transition hover:bg-gold-soft disabled:cursor-not-allowed disabled:opacity-50"
        >
          {sending ? "Disparando..." : `Disparar para ${selected.size} cliente(s)`}
        </button>
      </div>
    </div>
  );
}
