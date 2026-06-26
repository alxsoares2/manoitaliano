import { OrderRecord, OrderStatus } from "@/types/database";
import { STATUS_FLOW, STATUS_LABELS, STATUS_COLORS } from "@/lib/orderStatus";
import OrderCard from "./OrderCard";

export default function KanbanBoard({
  orders,
  onAdvance,
  onCancel,
}: {
  orders: OrderRecord[];
  onAdvance: (order: OrderRecord, status: OrderStatus) => void;
  onCancel: (order: OrderRecord) => void;
}) {
  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-4">
      {STATUS_FLOW.map((status) => {
        const columnOrders = orders.filter((order) => order.status === status);

        return (
          <div key={status} className="flex min-w-0 flex-col">
            <div
              className={`mb-3 flex items-center justify-between rounded-lg border px-3 py-2 ${STATUS_COLORS[status]}`}
            >
              <span className="text-sm font-semibold uppercase tracking-wide">
                {STATUS_LABELS[status]}
              </span>
              <span className="rounded-full bg-white/60 px-2 py-0.5 text-xs font-bold">
                {columnOrders.length}
              </span>
            </div>

            <div className="flex flex-col gap-3">
              {columnOrders.length === 0 ? (
                <p className="rounded-xl border border-dashed border-border p-4 text-center text-sm text-muted">
                  Nenhum pedido
                </p>
              ) : (
                columnOrders.map((order) => (
                  <OrderCard key={order.id} order={order} onAdvance={onAdvance} onCancel={onCancel} />
                ))
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
