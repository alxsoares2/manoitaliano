"use client";

import { OrderRecord, OrderStatus } from "@/types/database";
import { formatPrice } from "@/lib/format";
import { STATUS_LABELS, nextStatus } from "@/lib/orderStatus";
import { printOrderReceipt } from "@/lib/printReceipt";
import { buildWhatsappLink } from "@/lib/whatsapp";

export default function OrderCard({
  order,
  onAdvance,
}: {
  order: OrderRecord;
  onAdvance: (order: OrderRecord, status: OrderStatus) => void;
}) {
  const isDelivered = order.status === "entregue";
  const upcoming = nextStatus(order.status);
  const orderNumber = order.id.slice(0, 8).toUpperCase();
  const time = new Date(order.created_at).toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });

  const addressParts = [
    `${order.address}, ${order.address_number}`,
    order.neighborhood,
    order.complement,
    order.reference ? `Ref: ${order.reference}` : null,
  ].filter(Boolean);

  return (
    <div
      className={`rounded-xl border border-border bg-background-elevated p-5 shadow-sm transition ${
        isDelivered ? "opacity-60" : ""
      }`}
    >
      <div>
        <p className="text-lg font-semibold text-foreground">
          Pedido #{orderNumber}
        </p>
        <p className="text-xs text-muted">{time}</p>
      </div>

      <div className="mt-3 space-y-0.5 text-sm">
        <p>
          <span className="text-muted">Cliente:</span> {order.customer_name}
        </p>
        <p>
          <span className="text-muted">Telefone:</span> {order.customer_phone}
        </p>
        <p>
          <span className="text-muted">Endereço:</span> {addressParts.join(" — ")}
        </p>
      </div>

      <ul className="mt-3 space-y-1 border-t border-border pt-3 text-sm">
        {order.items.map((item, i) => (
          <li key={i} className="flex justify-between gap-2">
            <span>
              {item.qty}x {item.name}
              {item.size ? ` (${item.size})` : ""}
              {item.option ? ` — ${item.option}` : ""}
              {item.borda ? ` + borda ${item.borda}` : ""}
            </span>
            <span className="shrink-0 text-muted">
              {formatPrice((item.unitPrice + (item.bordaPrice ?? 0)) * item.qty)}
            </span>
          </li>
        ))}
      </ul>

      <div className="mt-3 border-t border-border pt-3">
        <span className="text-lg font-semibold text-foreground">
          {formatPrice(order.total)}
        </span>
        <div className="mt-2 flex flex-col gap-2">
          {upcoming && (
            <button
              onClick={() => onAdvance(order, upcoming)}
              className="w-full rounded-full bg-gold px-4 py-1.5 text-xs font-semibold uppercase tracking-widest text-white transition hover:bg-gold-soft"
            >
              Avançar para {STATUS_LABELS[upcoming]}
            </button>
          )}
          <button
            onClick={() => printOrderReceipt(order)}
            className="w-full rounded-full border border-border bg-background px-4 py-1.5 text-xs font-semibold uppercase tracking-widest text-muted transition hover:border-gold hover:text-gold"
          >
            Imprimir Comanda
          </button>
          <a
            href={buildWhatsappLink(order.customer_phone)}
            target="_blank"
            rel="noopener noreferrer"
            className="w-full rounded-full border border-border bg-background px-4 py-1.5 text-center text-xs font-semibold uppercase tracking-widest text-muted transition hover:border-green-500 hover:text-green-600"
          >
            WhatsApp
          </a>
        </div>
      </div>
    </div>
  );
}
