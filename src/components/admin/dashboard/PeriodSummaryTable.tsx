"use client";

import { useState } from "react";
import { OrderRecord } from "@/types/database";
import { Period, getPeriodSummary } from "@/lib/analytics";
import { formatPrice } from "@/lib/format";

const PERIOD_OPTIONS: { value: Period; label: string }[] = [
  { value: "today", label: "Hoje" },
  { value: "7days", label: "Últimos 7 dias" },
  { value: "30days", label: "Últimos 30 dias" },
  { value: "month", label: "Mês atual" },
];

export default function PeriodSummaryTable({ orders }: { orders: OrderRecord[] }) {
  const [period, setPeriod] = useState<Period>("today");
  const summary = getPeriodSummary(orders, period);

  return (
    <div className="rounded-xl border border-border bg-background-elevated p-5 shadow-sm">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm font-semibold uppercase tracking-widest text-muted">
          Resumo por período
        </p>
        <div className="flex gap-2">
          {PERIOD_OPTIONS.map((option) => (
            <button
              key={option.value}
              onClick={() => setPeriod(option.value)}
              className={`rounded-full px-4 py-1.5 text-xs font-semibold transition ${
                period === option.value
                  ? "bg-gold text-white"
                  : "border border-border text-muted hover:border-gold hover:text-gold"
              }`}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <Metric label="Pedidos" value={summary.count.toString()} />
        <Metric label="Faturamento" value={formatPrice(summary.revenue)} />
        <Metric label="Ticket médio" value={formatPrice(summary.avgTicket)} />
        <Metric label="Item mais pedido" value={summary.topItem} />
      </div>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-border bg-background p-4">
      <p className="text-xs font-semibold uppercase tracking-widest text-muted">{label}</p>
      <p className="mt-1 text-lg font-bold text-foreground">{value}</p>
    </div>
  );
}
