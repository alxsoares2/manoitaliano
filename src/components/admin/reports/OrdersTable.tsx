"use client";

import { OrderRecord } from "@/types/database";
import { STATUS_COLORS, STATUS_LABELS } from "@/lib/orderStatus";
import { formatPrice } from "@/lib/format";

const PAGE_SIZE = 20;

function summarizeItems(order: OrderRecord): string {
  return order.items
    .map((item) => `${item.qty}x ${item.name}${item.size ? ` (${item.size})` : ""}`)
    .join(", ");
}

export default function OrdersTable({
  orders,
  page,
  onPageChange,
}: {
  orders: OrderRecord[];
  page: number;
  onPageChange: (page: number) => void;
}) {
  const totalPages = Math.max(1, Math.ceil(orders.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const start = (currentPage - 1) * PAGE_SIZE;
  const pageOrders = orders.slice(start, start + PAGE_SIZE);

  return (
    <div className="rounded-xl border border-border bg-background-elevated p-5 shadow-sm">
      <p className="mb-4 text-sm font-semibold uppercase tracking-widest text-muted">
        Pedidos do período ({orders.length})
      </p>

      {orders.length === 0 ? (
        <p className="py-6 text-center text-sm text-muted">
          Nenhum pedido neste período.
        </p>
      ) : (
        <>
          <div className="overflow-x-auto rounded-lg border border-border">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-border text-xs uppercase tracking-widest text-muted">
                  <th className="px-4 py-3">Data/hora</th>
                  <th className="px-4 py-3">Pedido</th>
                  <th className="px-4 py-3">Cliente</th>
                  <th className="px-4 py-3">Itens</th>
                  <th className="px-4 py-3">Total</th>
                  <th className="px-4 py-3">Status</th>
                </tr>
              </thead>
              <tbody>
                {pageOrders.map((order) => (
                  <tr
                    key={order.id}
                    className="border-b border-border last:border-b-0"
                  >
                    <td className="px-4 py-3 whitespace-nowrap text-muted">
                      {new Date(order.created_at).toLocaleString("pt-BR", {
                        day: "2-digit",
                        month: "2-digit",
                        year: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap font-semibold text-foreground">
                      {order.order_number ? `#${order.order_number}` : `#${order.id.slice(0, 8).toUpperCase()}`}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-foreground">
                      {order.customer_name}
                    </td>
                    <td className="px-4 py-3 text-muted">{summarizeItems(order)}</td>
                    <td className="px-4 py-3 whitespace-nowrap font-semibold text-gold">
                      {formatPrice(order.total)}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span
                        className={`rounded-full border px-2.5 py-1 text-xs font-semibold ${STATUS_COLORS[order.status]}`}
                      >
                        {STATUS_LABELS[order.status]}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {totalPages > 1 && (
            <div className="mt-4 flex items-center justify-between">
              <button
                onClick={() => onPageChange(currentPage - 1)}
                disabled={currentPage === 1}
                className="rounded-full border border-border px-4 py-1.5 text-xs font-semibold text-muted transition hover:border-gold hover:text-gold disabled:cursor-not-allowed disabled:opacity-40"
              >
                Anterior
              </button>
              <span className="text-xs text-muted">
                Página {currentPage} de {totalPages}
              </span>
              <button
                onClick={() => onPageChange(currentPage + 1)}
                disabled={currentPage === totalPages}
                className="rounded-full border border-border px-4 py-1.5 text-xs font-semibold text-muted transition hover:border-gold hover:text-gold disabled:cursor-not-allowed disabled:opacity-40"
              >
                Próxima
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
