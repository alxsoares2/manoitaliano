"use client";

import { useState } from "react";
import { OrderRecord, OrderStatus } from "@/types/database";
import { formatPrice } from "@/lib/format";
import { STATUS_LABELS, nextStatus } from "@/lib/orderStatus";
import { printOrderReceipt } from "@/lib/printReceipt";
import { buildWhatsappLink } from "@/lib/whatsapp";

export default function OrderCard({
  order,
  onAdvance,
  onCancel,
}: {
  order: OrderRecord;
  onAdvance: (order: OrderRecord, status: OrderStatus) => void;
  onCancel: (order: OrderRecord) => void;
}) {
  const [expanded, setExpanded] = useState(false);

  const isDelivered = order.status === "entregue";
  const isCancelled = order.status === "cancelado";
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

  const paymentLabel = order.payment_method === "pix" ? "PIX" : order.payment_method === "card" ? "Cartão" : "—";

  return (
    <div
      className={`rounded-xl border bg-background-elevated shadow-sm transition ${
        isCancelled ? "border-red-200 opacity-50" : isDelivered ? "border-border opacity-60" : "border-border"
      }`}
    >
      {/* Header compacto — sempre visível */}
      <button
        onClick={() => setExpanded((e) => !e)}
        className="flex w-full items-center justify-between p-4 text-left"
      >
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="text-sm font-bold text-foreground">#{orderNumber}</span>
            <span className="text-sm text-foreground">{order.customer_name}</span>
          </div>
          <div className="mt-0.5 flex items-center gap-3 text-xs text-muted">
            <span>{time}</span>
            <span className="font-semibold text-foreground">{formatPrice(order.total)}</span>
            <span>{paymentLabel}</span>
          </div>
        </div>
        {order.notes && order.notes.trim() && (
          <span className="mr-2 rounded bg-yellow-100 px-1.5 py-0.5 text-[10px] font-bold uppercase text-yellow-700">OBS</span>
        )}
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          className={`h-4 w-4 shrink-0 text-muted transition-transform ${expanded ? "rotate-180" : ""}`}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {/* Detalhes expandidos */}
      {expanded && (
        <div className="border-t border-border px-4 pb-4 pt-3">
          {/* Observações em destaque */}
          {order.notes && order.notes.trim() && (
            <div className="mb-3 rounded-lg border-2 border-yellow-400 bg-yellow-50 px-3 py-2 text-sm">
              <span className="font-bold text-yellow-800">⚠ OBSERVAÇÕES:</span>
              <span className="ml-1 text-yellow-900">{order.notes}</span>
            </div>
          )}

          {/* Info do cliente */}
          <div className="space-y-0.5 text-sm">
            <p><span className="text-muted">Telefone:</span> {order.customer_phone}</p>
            <p><span className="text-muted">Endereço:</span> {addressParts.join(" — ")}</p>
            {order.cep && <p><span className="text-muted">CEP:</span> {order.cep}</p>}
          </div>

          {/* Itens */}
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

          {/* Totais */}
          <div className="mt-3 space-y-0.5 border-t border-border pt-3 text-sm">
            {order.discount && Number(order.discount) > 0 && (
              <>
                <div className="flex justify-between text-muted">
                  <span>Subtotal</span><span>{formatPrice(Number(order.subtotal ?? order.total))}</span>
                </div>
                <div className="flex justify-between text-green-600">
                  <span>Desconto{order.coupon_code ? ` (${order.coupon_code})` : ""}</span><span>-{formatPrice(Number(order.discount))}</span>
                </div>
              </>
            )}
            {order.delivery_fee && Number(order.delivery_fee) > 0 && (
              <div className="flex justify-between text-muted">
                <span>Frete</span><span>{formatPrice(Number(order.delivery_fee))}</span>
              </div>
            )}
            <div className="flex justify-between text-lg font-semibold text-foreground">
              <span>Total</span><span>{formatPrice(order.total)}</span>
            </div>
          </div>

          {/* Ações */}
          <div className="mt-3 flex flex-col gap-2 border-t border-border pt-3">
            {upcoming && (
              <button
                onClick={() => onAdvance(order, upcoming)}
                className="w-full rounded-full bg-gold px-4 py-1.5 text-xs font-semibold uppercase tracking-widest text-white transition hover:bg-gold-soft"
              >
                Avançar para {STATUS_LABELS[upcoming]}
              </button>
            )}
            {!isCancelled && (
              <button
                onClick={() => onCancel(order)}
                className="w-full rounded-full border border-red-300 bg-background px-4 py-1.5 text-xs font-semibold uppercase tracking-widest text-red-500 transition hover:bg-red-50"
              >
                Cancelar pedido
              </button>
            )}
            <div className="flex gap-2">
              <button
                onClick={() => printOrderReceipt(order)}
                className="flex-1 rounded-full border border-border bg-background px-4 py-1.5 text-xs font-semibold uppercase tracking-widest text-muted transition hover:border-gold hover:text-gold"
              >
                Comanda
              </button>
              <a
                href={buildWhatsappLink(order.customer_phone)}
                target="_blank"
                rel="noopener noreferrer"
                className="flex-1 rounded-full border border-border bg-background px-4 py-1.5 text-center text-xs font-semibold uppercase tracking-widest text-muted transition hover:border-green-500 hover:text-green-600"
              >
                WhatsApp
              </a>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
