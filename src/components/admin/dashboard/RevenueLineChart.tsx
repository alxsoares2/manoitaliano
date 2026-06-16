"use client";

import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { DailyPoint } from "@/lib/analytics";
import { formatPrice } from "@/lib/format";

export default function RevenueLineChart({ data }: { data: DailyPoint[] }) {
  return (
    <div className="rounded-xl border border-border bg-background-elevated p-5 shadow-sm">
      <p className="mb-4 text-sm font-semibold uppercase tracking-widest text-muted">
        Faturamento — últimos 30 dias
      </p>
      <div className="h-72 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
            <XAxis
              dataKey="date"
              tick={{ fontSize: 11, fill: "var(--muted)" }}
              interval={2}
            />
            <YAxis
              tick={{ fontSize: 11, fill: "var(--muted)" }}
              tickFormatter={(value) => formatPrice(value as number)}
              width={70}
            />
            <Tooltip
              formatter={(value) => formatPrice(Number(value))}
              contentStyle={{
                background: "var(--background-elevated)",
                border: "1px solid var(--border)",
                borderRadius: "8px",
                fontSize: "12px",
              }}
            />
            <Line
              type="monotone"
              dataKey="revenue"
              stroke="var(--gold)"
              strokeWidth={2}
              dot={false}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
