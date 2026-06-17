"use client";

import { useEffect, useState } from "react";
import { useCart } from "@/context/CartContext";
import { supabase } from "@/lib/supabase";
import { formatPrice } from "@/lib/format";
import CheckoutForm from "./CheckoutForm";
import OrderSuccess from "./OrderSuccess";
import PaymentStep from "./PaymentStep";
import PixDisplay from "./PixDisplay";
import { CustomerDetails, emptyCustomerDetails } from "@/types/order";

type Step = "cart" | "checkout" | "payment" | "pix" | "success";
type PixData = { qrCode: string; qrCodeBase64: string; orderId: string };

export default function CartSidebar() {
  const { items, isOpen, closeCart, updateQty, removeItem, totalPrice, clearCart } = useCart();
  const [step, setStep] = useState<Step>("cart");
  const [orderDetails, setOrderDetails] = useState<CustomerDetails>(emptyCustomerDetails);
  const [pixData, setPixData] = useState<PixData | null>(null);

  // Limpa o carrinho e mostra sucesso SOMENTE quando o PIX é confirmado pelo
  // webhook (status sai de "pendente"). Se o cliente fechar sem pagar, o
  // carrinho permanece intacto (persistido em localStorage).
  useEffect(() => {
    if (step !== "pix" || !pixData) return;

    const channel = supabase
      .channel(`pix-confirm-${pixData.orderId}`)
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "orders", filter: `id=eq.${pixData.orderId}` },
        (payload) => {
          const status = (payload.new as { status?: string }).status;
          if (status && status !== "pendente" && status !== "cancelado") {
            clearCart();
            setStep("success");
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [step, pixData, clearCart]);

  if (!isOpen) return null;

  const handleClose = () => {
    closeCart();
    if (step === "success" || step === "pix") {
      setStep("cart");
      setPixData(null);
    }
  };

  const handleCheckoutSubmit = (details: CustomerDetails) => {
    setOrderDetails(details);
    setStep("payment");
  };

  const handlePixCreated = (data: PixData) => {
    // Não limpa o carrinho aqui — só após a confirmação do pagamento (webhook).
    setPixData(data);
    setStep("pix");
  };

  const handleCardSuccess = () => {
    clearCart();
    setStep("success");
  };

  const sidebar = (content: React.ReactNode) => (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/40 backdrop-blur-sm">
      <div className="absolute inset-0" onClick={handleClose} aria-hidden="true" />
      <aside className="relative flex h-full w-full max-w-md flex-col border-l border-border bg-background-elevated shadow-2xl">
        {content}
      </aside>
    </div>
  );

  if (step === "checkout") return sidebar(<CheckoutForm onBack={() => setStep("cart")} onSubmit={handleCheckoutSubmit} />);
  if (step === "payment") return sidebar(<PaymentStep customer={orderDetails} items={items} total={totalPrice} onBack={() => setStep("checkout")} onPixCreated={handlePixCreated} onCardSuccess={handleCardSuccess} />);
  if (step === "pix" && pixData) return sidebar(<PixDisplay qrCode={pixData.qrCode} qrCodeBase64={pixData.qrCodeBase64} onClose={handleClose} />);
  if (step === "success") return sidebar(<OrderSuccess details={orderDetails} onClose={handleClose} />);

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/40 backdrop-blur-sm">
      <div className="absolute inset-0" onClick={closeCart} aria-hidden="true" />
      <aside className="relative flex h-full w-full max-w-md flex-col border-l border-border bg-background-elevated shadow-2xl">
        <div className="flex items-center justify-between border-b border-border px-5 py-4">
          <h2 className="font-display text-xl font-semibold text-foreground">Seu carrinho</h2>
          <button
            onClick={closeCart}
            className="rounded-full border border-border p-2 text-muted transition hover:border-foreground hover:text-foreground"
            aria-label="Fechar carrinho"
          >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-4 w-4">
              <path strokeLinecap="round" d="M6 6l12 12M18 6 6 18" />
            </svg>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-4">
          {items.length === 0 ? (
            <p className="mt-16 text-center text-sm text-muted">
              Seu carrinho está vazio. Escolha uma pizza deliciosa para começar! 🍕
            </p>
          ) : (
            <ul className="space-y-3">
              {items.map((item) => (
                <li key={item.lineId} className="rounded-xl border border-border bg-background p-4">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="font-medium text-foreground">
                        {item.name}{item.size ? ` (${item.size})` : ""}
                      </p>
                      {item.option && <p className="text-xs text-muted">{item.option}</p>}
                      {item.borda && <p className="text-xs text-muted">Borda: {item.borda}</p>}
                    </div>
                    <button onClick={() => removeItem(item.lineId)} className="text-xs text-muted transition hover:text-red-500">
                      Remover
                    </button>
                  </div>
                  <div className="mt-3 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <button onClick={() => updateQty(item.lineId, item.qty - 1)} className="flex h-7 w-7 items-center justify-center rounded-full border border-border text-foreground transition hover:border-foreground">−</button>
                      <span className="w-6 text-center text-sm">{item.qty}</span>
                      <button onClick={() => updateQty(item.lineId, item.qty + 1)} className="flex h-7 w-7 items-center justify-center rounded-full border border-border text-foreground transition hover:border-foreground">+</button>
                    </div>
                    <span className="font-semibold text-foreground">
                      {formatPrice((item.unitPrice + (item.bordaPrice ?? 0)) * item.qty)}
                    </span>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="border-t border-border px-5 py-4">
          <div className="mb-4 flex items-center justify-between">
            <span className="text-sm text-muted">Total</span>
            <span className="font-display text-xl font-semibold text-foreground">{formatPrice(totalPrice)}</span>
          </div>
          <button
            disabled={items.length === 0}
            onClick={() => setStep("checkout")}
            className="w-full rounded-xl bg-foreground px-5 py-3.5 font-semibold text-background transition hover:bg-gold-soft disabled:cursor-not-allowed disabled:opacity-40"
          >
            Fechar pedido
          </button>
        </div>
      </aside>
    </div>
  );
}
