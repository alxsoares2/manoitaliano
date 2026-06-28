"use client";

import { useState } from "react";
import { OrderRecord } from "@/types/database";

const CANCEL_REASONS = [
  "Cliente desistiu",
  "Item indisponível",
  "Endereço não atendido",
  "Problema no pagamento",
  "Outro",
];

export default function CancelModal({
  order,
  onConfirm,
  onClose,
}: {
  order: OrderRecord;
  onConfirm: (order: OrderRecord, reason: string) => void;
  onClose: () => void;
}) {
  const [reason, setReason] = useState(CANCEL_REASONS[0]);
  const orderNumber = order.order_number ? `${order.order_number}` : order.id.slice(0, 8).toUpperCase();

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-sm rounded-2xl border border-border bg-background-elevated p-6 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="mb-1 font-display text-lg font-bold text-foreground">
          Cancelar pedido #{orderNumber}
        </h2>
        <p className="mb-4 text-sm text-muted">
          Selecione o motivo do cancelamento. O cliente receberá uma mensagem
          automática via WhatsApp.
        </p>

        <div className="mb-5 flex flex-col gap-2">
          {CANCEL_REASONS.map((r) => (
            <label
              key={r}
              className={`flex cursor-pointer items-center gap-3 rounded-lg border px-4 py-3 text-sm transition ${
                reason === r
                  ? "border-red-400 bg-red-50 text-red-700"
                  : "border-border text-muted hover:border-red-300"
              }`}
            >
              <input
                type="radio"
                name="cancel-reason"
                value={r}
                checked={reason === r}
                onChange={() => setReason(r)}
                className="accent-red-500"
              />
              {r}
            </label>
          ))}
        </div>

        <div className="flex gap-2">
          <button
            onClick={onClose}
            className="flex-1 rounded-full border border-border px-4 py-2 text-sm font-semibold text-muted transition hover:border-foreground hover:text-foreground"
          >
            Voltar
          </button>
          <button
            onClick={() => onConfirm(order, reason)}
            className="flex-1 rounded-full bg-red-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-red-700"
          >
            Confirmar cancelamento
          </button>
        </div>
      </div>
    </div>
  );
}
