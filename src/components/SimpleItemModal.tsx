"use client";

import { useState } from "react";
import { SimpleItem } from "@/types/menu";
import { useCart } from "@/context/CartContext";
import { formatPrice } from "@/lib/format";

export default function SimpleItemModal({ item, onClose }: { item: SimpleItem; onClose: () => void }) {
  const { addItem } = useCart();
  const [option, setOption] = useState(item.options?.[0] ?? "");

  const handleAdd = () => {
    addItem({ itemId: item.id, name: item.name, unitPrice: item.price, option: option || undefined });
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 backdrop-blur-sm sm:items-center"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md rounded-t-2xl border border-border bg-background-elevated p-6 shadow-2xl sm:rounded-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-5 flex items-start justify-between gap-4">
          <div>
            <h2 className="font-display text-2xl font-semibold text-foreground">{item.name}</h2>
            {item.description && <p className="mt-1 text-sm leading-relaxed text-muted">{item.description}</p>}
          </div>
          <button
            onClick={onClose}
            className="shrink-0 rounded-full border border-border p-2 text-muted transition hover:border-foreground hover:text-foreground"
            aria-label="Fechar"
          >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-4 w-4">
              <path strokeLinecap="round" d="M6 6l12 12M18 6 6 18" />
            </svg>
          </button>
        </div>

        {item.options && (
          <div className="mb-6">
            <h3 className="mb-2 text-xs font-semibold uppercase tracking-widest text-muted">Escolha uma opção</h3>
            <div className="space-y-2">
              {item.options.map((opt) => (
                <label
                  key={opt}
                  className={`flex cursor-pointer items-center gap-2 rounded-lg border px-3 py-2.5 text-sm transition ${
                    option === opt ? "border-foreground bg-foreground/5" : "border-border hover:border-foreground/40"
                  }`}
                >
                  <input type="radio" name="option" className="accent-foreground" checked={option === opt} onChange={() => setOption(opt)} />
                  {opt}
                </label>
              ))}
            </div>
          </div>
        )}

        <button
          onClick={handleAdd}
          className="flex w-full items-center justify-between rounded-xl bg-foreground px-5 py-3.5 font-semibold text-background transition hover:bg-gold-soft"
        >
          <span>Adicionar ao carrinho</span>
          <span>{formatPrice(item.price)}</span>
        </button>
      </div>
    </div>
  );
}
