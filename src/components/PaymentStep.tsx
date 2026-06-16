"use client";

import { useState } from "react";
import { formatPrice } from "@/lib/format";
import CardForm from "./CardForm";
import { CartItem } from "@/context/CartContext";
import { CustomerDetails } from "@/types/order";

type PaymentMethod = "pix" | "card" | null;

function MercadoPagoLogo() {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img src="/mercadopago-logo.svg" alt="Mercado Pago" className="h-4 w-auto opacity-80" />
  );
}

export default function PaymentStep({
  customer, items, total, onBack, onPixCreated, onCardSuccess,
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
    name: item.name, size: item.size, borda: item.borda, option: item.option,
    qty: item.qty, unitPrice: item.unitPrice, bordaPrice: item.bordaPrice,
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
      {/* Header */}
      <div className="flex items-center gap-3 border-b border-border px-5 py-4">
        <button type="button" onClick={onBack} className="rounded-full border border-border p-2 text-muted transition hover:border-foreground hover:text-foreground" aria-label="Voltar">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-4 w-4">
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 6l-6 6 6 6" />
          </svg>
        </button>
        <h2 className="font-display text-xl font-semibold text-foreground">Pagamento</h2>
      </div>

      <div className="flex-1 overflow-y-auto px-5 py-5">
        <p className="mb-5 text-sm text-muted">
          Escolha a forma de pagamento para o pedido de{" "}
          <span className="font-semibold text-foreground">{formatPrice(total)}</span>:
        </p>

        <div className="grid grid-cols-2 gap-3">
          {/* PIX */}
          <button
            onClick={() => { setMethod("pix"); setError(null); }}
            className={`flex flex-col items-center gap-2 rounded-xl border p-4 transition ${
              method === "pix" ? "border-foreground bg-foreground/5" : "border-border hover:border-foreground/40"
            }`}
          >
            <span className="text-3xl">⚡</span>
            <span className="text-sm font-semibold text-foreground">PIX</span>
            <span className="text-xs text-muted">Aprovação imediata</span>
            <MercadoPagoLogo />
          </button>

          {/* Cartão */}
          <button
            onClick={() => { setMethod("card"); setError(null); }}
            className={`flex flex-col items-center gap-2 rounded-xl border p-4 transition ${
              method === "card" ? "border-foreground bg-foreground/5" : "border-border hover:border-foreground/40"
            }`}
          >
            <span className="text-3xl">💳</span>
            <span className="text-sm font-semibold text-foreground">Cartão de crédito</span>
            <span className="text-xs text-muted">Até 1x sem juros</span>
            <MercadoPagoLogo />
          </button>
        </div>

        {/* Segurança */}
        <div className="mt-3 flex items-center gap-1.5 text-xs text-muted">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-3.5 w-3.5 shrink-0 text-gold-soft">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 2l7 4v6c0 5-7 10-7 10S5 17 5 12V6l7-4z" />
          </svg>
          <span>Pagamento processado com segurança pelo Mercado Pago</span>
        </div>

        {method === "pix" && (
          <div className="mt-6">
            <div className="rounded-xl border border-border bg-background p-4 text-sm text-muted">
              <p>✅ Após confirmar, um <strong className="text-foreground">QR Code PIX</strong> será gerado.</p>
              <p className="mt-1">⏱ Você terá <strong className="text-foreground">30 minutos</strong> para pagar.</p>
              <p className="mt-1">🔔 O pedido entra na cozinha assim que o pagamento for confirmado.</p>
            </div>
            {error && <p className="mt-3 text-sm text-red-500">{error}</p>}
            <button
              onClick={handlePix}
              disabled={loading}
              className="mt-4 w-full rounded-xl bg-foreground px-5 py-3.5 font-semibold text-background transition hover:bg-gold-soft disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading ? "Gerando PIX..." : "Gerar QR Code PIX"}
            </button>
          </div>
        )}

        {method === "card" && (
          <div className="mt-6">
            <CardForm customer={customer} items={orderItems} total={total} onSuccess={onCardSuccess} />
          </div>
        )}
      </div>

      {/* Rodapé segurança */}
      <div className="border-t border-border px-5 py-4">
        <div className="flex items-center gap-1.5 text-xs text-muted">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-3.5 w-3.5 shrink-0 text-gold-soft">
            <rect x="3" y="11" width="18" height="11" rx="2" />
            <path strokeLinecap="round" strokeLinejoin="round" d="M7 11V7a5 5 0 0110 0v4" />
          </svg>
          <span>Seus dados são protegidos com criptografia SSL</span>
        </div>
        <div className="mt-2 flex items-center gap-2">
          <div className="flex items-center rounded-md border border-border bg-background px-2.5 py-1.5">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/mercadopago-logo.svg" alt="Mercado Pago" className="h-4 w-auto" />
          </div>
          <div className="flex items-center gap-1.5 rounded-md border border-border bg-background px-2.5 py-1.5">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="h-3.5 w-3.5 text-gold-soft">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 2l7 4v6c0 5-7 10-7 10S5 17 5 12V6l7-4z" />
            </svg>
            <span className="text-xs font-medium text-muted">SSL Seguro</span>
          </div>
          <div className="flex items-center gap-1.5 rounded-md border border-border bg-background px-2.5 py-1.5">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="h-3.5 w-3.5 text-gold-soft">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
            </svg>
            <span className="text-xs font-medium text-muted">PCI DSS</span>
          </div>
        </div>
      </div>
    </div>
  );
}
