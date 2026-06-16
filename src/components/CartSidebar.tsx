"use client";

import { useState } from "react";
import { useCart } from "@/context/CartContext";
import { formatPrice } from "@/lib/format";
import CheckoutForm from "./CheckoutForm";
import OrderSuccess from "./OrderSuccess";
import PaymentStep from "./PaymentStep";
import PixDisplay from "./PixDisplay";
import { CustomerDetails, emptyCustomerDetails } from "@/types/order";

type Step = "cart" | "checkout" | "payment" | "pix" | "success";

type PixData = { qrCode: string; qrCodeBase64: string; orderId: string };

export default function CartSidebar() {
  const { items, isOpen, closeCart, updateQty, removeItem, totalPrice, clearCart } =
    useCart();
  const [step, setStep] = useState<Step>("cart");
  const [orderDetails, setOrderDetails] = useState<CustomerDetails>(emptyCustomerDetails);
  const [pixData, setPixData] = useState<PixData | null>(null);

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
    setPixData(data);
    clearCart();
    setStep("pix");
  };

  const handleCardSuccess = () => {
    clearCart();
    setStep("success");
  };

  const sidebar = (content: React.ReactNode) => (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/70 backdrop-blur-sm">
      <div className="absolute inset-0" onClick={handleClose} aria-hidden="true" />
      <aside className="relative flex h-full w-full max-w-md flex-col border-l border-border bg-background-elevated shadow-2xl">
        {content}
      </aside>
    </div>
  );

  if (step === "checkout") {
    return sidebar(
      <CheckoutForm
        onBack={() => setStep("cart")}
        onSubmit={handleCheckoutSubmit}
      />
    );
  }

  if (step === "payment") {
    return sidebar(
      <PaymentStep
        customer={orderDetails}
        items={items}
        total={totalPrice}
        onBack={() => setStep("checkout")}
        onPixCreated={handlePixCreated}
        onCardSuccess={handleCardSuccess}
      />
    );
  }

  if (step === "pix" && pixData) {
    return sidebar(
      <PixDisplay
        qrCode={pixData.qrCode}
        qrCodeBase64={pixData.qrCodeBase64}
        onClose={handleClose}
      />
    );
  }

  if (step === "success") {
    return sidebar(
      <OrderSuccess details={orderDetails} onClose={handleClose} />
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/70 backdrop-blur-sm">
      <div className="absolute inset-0" onClick={closeCart} aria-hidden="true" />
      <aside className="relative flex h-full w-full max-w-md flex-col border-l border-border bg-background-elevated shadow-2xl">
        <div className="flex items-center justify-between border-b border-border px-5 py-4">
          <h2 className="font-display text-xl font-semibold text-gold-soft">
            Seu carrinho
          </h2>
          <button
            onClick={closeCart}
            className="rounded-full border border-border p-2 text-muted transition hover:border-gold hover:text-gold-soft"
            aria-label="Fechar carrinho"
          >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-4 w-4">
              <path strokeLinecap="round" d="M6 6l12 12M18 6 6 18" />
            </svg>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-4">
          {items.length === 0 ? (
            <p className="mt-10 text-center text-sm text-muted">
              Seu carrinho está vazio. Escolha uma pizza deliciosa para começar! 🍕
            </p>
          ) : (
            <ul className="space-y-4">
              {items.map((item) => (
                <li key={item.lineId} className="rounded-xl border border-border p-3">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="font-medium text-foreground">
                        {item.name}{item.size ? ` (${item.size})` : ""}
                      </p>
                      {item.option && <p className="text-xs text-muted">{item.option}</p>}
                      {item.borda && <p className="text-xs text-muted">Borda: {item.borda}</p>}
                    </div>
                    <button
                      onClick={() => removeItem(item.lineId)}
                      className="text-xs text-muted transition hover:text-red-400"
                    >
                      Remover
                    </button>
                  </div>

                  <div className="mt-3 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => updateQty(item.lineId, item.qty - 1)}
                        className="flex h-7 w-7 items-center justify-center rounded-full border border-border text-foreground transition hover:border-gold"
                      >
                        −
                      </button>
                      <span className="w-6 text-center">{item.qty}</span>
                      <button
                        onClick={() => updateQty(item.lineId, item.qty + 1)}
                        className="flex h-7 w-7 items-center justify-center rounded-full border border-border text-foreground transition hover:border-gold"
                      >
                        +
                      </button>
                    </div>
                    <span className="font-medium text-gold">
                      {formatPrice((item.unitPrice + (item.bordaPrice ?? 0)) * item.qty)}
                    </span>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="border-t border-border px-5 py-4">
          <div className="mb-3 flex items-center justify-between text-lg">
            <span className="text-muted">Total</span>
            <span className="font-display font-semibold text-gold-soft">
              {formatPrice(totalPrice)}
            </span>
          </div>
          <button
            disabled={items.length === 0}
            onClick={() => setStep("checkout")}
            className="w-full rounded-xl bg-gold px-5 py-3.5 font-semibold text-background transition hover:bg-gold-soft disabled:cursor-not-allowed disabled:opacity-40"
          >
            Fechar pedido
          </button>
        </div>
      </aside>
    </div>
  );
}
