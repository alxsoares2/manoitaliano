import { OrderRecord } from "@/types/database";
import { formatPrice } from "@/lib/format";

export default function DaySummary({ orders }: { orders: OrderRecord[] }) {
  const today = new Date().toDateString();
  const todayOrders = orders.filter(
    (order) => new Date(order.created_at).toDateString() === today
  );
  const revenueToday = todayOrders.reduce((sum, order) => sum + order.total, 0);
  const openOrders = orders.filter((order) => order.status !== "entregue").length;

  return (
    <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
      <SummaryCard label="Pedidos hoje" value={todayOrders.length.toString()} />
      <SummaryCard label="Faturamento hoje" value={formatPrice(revenueToday)} />
      <SummaryCard label="Pedidos em aberto" value={openOrders.toString()} />
    </div>
  );
}

function SummaryCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-border bg-background-elevated p-5 shadow-sm">
      <p className="text-xs font-semibold uppercase tracking-widest text-muted">
        {label}
      </p>
      <p className="mt-2 text-2xl font-bold text-foreground">{value}</p>
    </div>
  );
}
