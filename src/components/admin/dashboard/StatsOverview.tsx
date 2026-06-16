import { TodaySummary } from "@/lib/analytics";
import { formatPercent, formatPrice } from "@/lib/format";

export default function StatsOverview({ summary }: { summary: TodaySummary }) {
  const { today, revenueChangePct, ordersChangePct } = summary;

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
      <StatCard
        label="Faturamento do dia"
        value={formatPrice(today.revenue)}
        change={revenueChangePct}
      />
      <StatCard
        label="Pedidos hoje"
        value={today.count.toString()}
        change={ordersChangePct}
      />
      <StatCard label="Ticket médio do dia" value={formatPrice(today.avgTicket)} />
    </div>
  );
}

function StatCard({
  label,
  value,
  change,
}: {
  label: string;
  value: string;
  change?: number | null;
}) {
  const showChange = change !== undefined;
  const isPositive = (change ?? 0) >= 0;

  return (
    <div className="rounded-xl border border-border bg-background-elevated p-5 shadow-sm">
      <p className="text-xs font-semibold uppercase tracking-widest text-muted">{label}</p>
      <p className="mt-2 text-2xl font-bold text-foreground">{value}</p>
      {showChange && (
        <p
          className={`mt-1 text-xs font-semibold ${
            isPositive ? "text-green-600" : "text-red-600"
          }`}
        >
          {formatPercent(change)} vs. ontem
        </p>
      )}
    </div>
  );
}
