import { ReportSummary as ReportSummaryType } from "@/lib/analytics";
import { formatPrice } from "@/lib/format";

export default function ReportSummary({ summary }: { summary: ReportSummaryType }) {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <SummaryCard label="Total de pedidos" value={summary.count.toString()} />
      <SummaryCard label="Faturamento total" value={formatPrice(summary.revenue)} />
      <SummaryCard label="Ticket médio" value={formatPrice(summary.avgTicket)} />
      <SummaryCard label="Maior pedido" value={formatPrice(summary.biggestOrder)} />
    </div>
  );
}

function SummaryCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-border bg-background-elevated p-5 shadow-sm">
      <p className="text-xs font-semibold uppercase tracking-widest text-muted">{label}</p>
      <p className="mt-2 text-2xl font-bold text-foreground">{value}</p>
    </div>
  );
}
