"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { CustomerRecord } from "@/types/customer";
import { OrderRecord } from "@/types/database";
import { STATUS_LABELS } from "@/lib/orderStatus";
import { formatPrice } from "@/lib/format";

export default function CustomerHistoryPanel({
  customer,
  onClose,
}: {
  customer: CustomerRecord;
  onClose: () => void;
}) {
  const [orders, setOrders] = useState<OrderRecord[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;

    supabase
      .from("orders")
      .select("*")
      .eq("customer_phone", customer.phone)
      .order("created_at", { ascending: false })
      .then(({ data }) => {
        if (active && data) setOrders(data as OrderRecord[]);
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [customer.phone]);

  const addressParts = [
    customer.address ? `${customer.address}, ${customer.address_number}` : null,
    customer.neighborhood,
    customer.complement,
    customer.reference ? `Ref: ${customer.reference}` : null,
  ].filter(Boolean);

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/40 backdrop-blur-sm" onClick={onClose}>
      <div
        className="h-full w-full max-w-md overflow-y-auto bg-background-elevated p-6 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-start justify-between gap-4">
          <div>
            <h2 className="text-xl font-semibold text-foreground">{customer.name}</h2>
            <p className="text-sm text-muted">{customer.phone}</p>
          </div>
          <button
            onClick={onClose}
            className="shrink-0 rounded-full border border-border p-2 text-muted transition hover:border-gold hover:text-gold"
            aria-label="Fechar"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              className="h-4 w-4"
            >
              <path strokeLinecap="round" d="M6 6l12 12M18 6 6 18" />
            </svg>
          </button>
        </div>

        <div className="mb-4 rounded-xl border border-border bg-background p-4 text-sm">
          <p className="text-muted">Endereço mais recente:</p>
          <p className="text-foreground">{addressParts.join(" — ") || "—"}</p>
        </div>

        <div className="mb-6 grid grid-cols-3 gap-3">
          <div className="rounded-xl border border-border bg-background p-3">
            <p className="text-xs uppercase tracking-widest text-muted">Total gasto</p>
            <p className="mt-1 text-lg font-bold text-foreground">
              {formatPrice(customer.total_spent)}
            </p>
          </div>
          <div className="rounded-xl border border-border bg-background p-3">
            <p className="text-xs uppercase tracking-widest text-muted">Pedidos</p>
            <p className="mt-1 text-lg font-bold text-foreground">{customer.orders_count}</p>
          </div>
          <div className="rounded-xl border border-border bg-background p-3">
            <p className="text-xs uppercase tracking-widest text-muted">Último pedido</p>
            <p className="mt-1 text-sm font-semibold text-foreground">
              {new Date(customer.last_order_at).toLocaleDateString("pt-BR")}
            </p>
          </div>
        </div>

        <h3 className="mb-3 text-sm font-semibold uppercase tracking-widest text-muted">
          Histórico de pedidos
        </h3>

        {loading ? (
          <p className="text-sm text-muted">Carregando pedidos...</p>
        ) : orders.length === 0 ? (
          <p className="text-sm text-muted">Nenhum pedido encontrado.</p>
        ) : (
          <div className="space-y-3">
            {orders.map((order) => (
              <div key={order.id} className="rounded-xl border border-border bg-background p-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-semibold text-foreground">
                    Pedido {order.order_number ? `#${order.order_number}` : `#${order.id.slice(0, 8).toUpperCase()}`}
                  </span>
                  <span className="text-xs text-muted">
                    {new Date(order.created_at).toLocaleString("pt-BR", {
                      day: "2-digit",
                      month: "2-digit",
                      year: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </span>
                </div>
                <ul className="mt-2 space-y-1 text-sm">
                  {order.items.map((item, i) => (
                    <li key={i} className="flex justify-between gap-2 text-muted">
                      <span>
                        {item.qty}x {item.name}
                        {item.size ? ` (${item.size})` : ""}
                        {item.option ? ` — ${item.option}` : ""}
                        {item.borda ? ` + borda ${item.borda}` : ""}
                      </span>
                    </li>
                  ))}
                </ul>
                <div className="mt-2 flex items-center justify-between border-t border-border pt-2">
                  <span className="text-xs font-semibold uppercase tracking-widest text-gold">
                    {STATUS_LABELS[order.status]}
                  </span>
                  <span className="font-semibold text-foreground">
                    {formatPrice(order.total)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
