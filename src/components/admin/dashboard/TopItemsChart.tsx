"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { TopItem } from "@/lib/analytics";

export default function TopItemsChart({ data }: { data: TopItem[] }) {
  const chartData = [...data].reverse();

  return (
    <div className="rounded-xl border border-border bg-background-elevated p-5 shadow-sm">
      <p className="mb-4 text-sm font-semibold uppercase tracking-widest text-muted">
        Top 5 itens mais pedidos
      </p>
      {chartData.length === 0 ? (
        <p className="py-10 text-center text-sm text-muted">Sem pedidos suficientes.</p>
      ) : (
        <div className="h-72 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={chartData}
              layout="vertical"
              margin={{ top: 5, right: 20, left: 0, bottom: 0 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis type="number" tick={{ fontSize: 11, fill: "var(--muted)" }} />
              <YAxis
                type="category"
                dataKey="name"
                tick={{ fontSize: 11, fill: "var(--muted)" }}
                width={140}
              />
              <Tooltip
                contentStyle={{
                  background: "var(--background-elevated)",
                  border: "1px solid var(--border)",
                  borderRadius: "8px",
                  fontSize: "12px",
                }}
              />
              <Bar dataKey="qty" name="Quantidade" fill="var(--gold)" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}
