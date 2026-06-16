"use client";

import { useState } from "react";
import { formatPrice } from "@/lib/format";
import CardForm from "./CardForm";
import { CartItem } from "@/context/CartContext";
import { CustomerDetails } from "@/types/order";

type PaymentMethod = "pix" | "card" | null;

export default function PaymentStep({
  customer,
  items,
  total,
  onBack,
  onPixCreated,
  onCardSuccess,
}: {
  customer: CustomerDetails;
  items: CartItem[];
  total: number;
  onBack: () => void;
  onPixCreated: (data: { qrCode: string; qrCodeBase64: string; orderId: string }) => void;
  onCardSuccess: () => void;
}) {
  const [method, setMethod] = useState<PaymentMethod>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const orderItems = items.map((item) => ({
    name: item.name,
    size: item.size,
    borda: item.borda,
    option: item.option,
    qty: item.qty,
    unitPrice: item.unitPrice,
    bordaPrice: item.bordaPrice,
  }));

  const handlePix = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/payment/create-pix", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ customer, items: orderItems, total }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Erro ao gerar PIX.");
      onPixCreated({ qrCode: data.qrCode, qrCodeBase64: data.qrCodeBase64, orderId: data.orderId });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro inesperado.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center gap-3 border-b border-border px-5 py-4">
        <button
          type="button"
          onClick={onBack}
          className="rounded-full border border-border p-2 text-muted transition hover:border-gold hover:text-gold-soft"
          aria-label="Voltar"
        >
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-4 w-4">
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 6l-6 6 6 6" />
          </svg>
        </button>
        <h2 className="font-display text-xl font-semibold text-gold-soft">Pagamento</h2>
      </div>

      <div className="flex-1 overflow-y-auto px-5 py-4">
        <p className="mb-4 text-sm text-muted">Escolha a forma de pagamento para o pedido de <span className="font-semibold text-foreground">{formatPrice(total)}</span>:</p>

        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={() => { setMethod("pix"); setError(null); }}
            className={`flex flex-col items-center gap-2 rounded-xl border p-4 transition ${
              method === "pix"
                ? "border-gold bg-gold/10 text-gold"
                : "border-border text-muted hover:border-gold hover:text-gold-soft"
            }`}
          >
            <span className="text-3xl">⚡</span>
            <span className="text-sm font-semibold">PIX</span>
            <span className="text-xs opacity-70">Aprovação imediata</span>
          </button>

          <button
            onClick={() => { setMethod("card"); setError(null); }}
            className={`flex flex-col items-center gap-2 rounded-xl border p-4 transition ${
              method === "card"
                ? "border-gold bg-gold/10 text-gold"
                : "border-border text-muted hover:border-gold hover:text-gold-soft"
            }`}
          >
            <span className="text-3xl">💳</span>
            <span className="text-sm font-semibold">Cartão de crédito</span>
            <span className="text-xs opacity-70">Até 1x sem juros</span>
          </button>
        </div>

        {method === "pix" && (
          <div className="mt-6">
            <div className="rounded-xl border border-border bg-background/50 p-4 text-sm text-muted">
              <p>✅ Após confirmar, um <strong className="text-foreground">QR Code PIX</strong> será gerado.</p>
              <p className="mt-1">⏱ Você terá <strong className="text-foreground">30 minutos</strong> para pagar.</p>
              <p className="mt-1">🔔 O pedido entra na cozinha assim que o pagamento for confirmado.</p>
            </div>
            {error && <p className="mt-3 text-sm text-red-400">{error}</p>}
            <button
              onClick={handlePix}
              disabled={loading}
              className="mt-4 w-full rounded-xl bg-gold px-5 py-3.5 font-semibold text-background transition hover:bg-gold-soft disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading ? "Gerando PIX..." : "Gerar QR Code PIX"}
            </button>
          </div>
        )}

        {method === "card" && (
          <div className="mt-6">
            <CardForm
              customer={customer}
              items={orderItems}
              total={total}
              onSuccess={onCardSuccess}
            />
          </div>
        )}
      </div>
    </div>
  );
}
