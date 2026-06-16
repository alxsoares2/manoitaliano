"use client";

import { useState } from "react";
import { PizzaItem } from "@/types/menu";
import { bordaGroups } from "@/data/menu";
import { useCart } from "@/context/CartContext";
import { formatPrice } from "@/lib/format";

export default function PizzaModal({ pizza, onClose }: { pizza: PizzaItem; onClose: () => void }) {
  const { addItem } = useCart();
  const [size, setSize] = useState<"media" | "grande">("media");
  const [bordaKey, setBordaKey] = useState<string>("none");

  const sizePrice = pizza.prices[size];
  const sizeLabel = size === "media" ? "Média" : "Grande";

  const bordaOptions = bordaGroups.flatMap((group) =>
    group.options.map((opt) => ({ key: `${group.id}::${opt}`, label: opt, price: group.price }))
  );

  const selectedBorda = bordaKey === "none" ? null : bordaOptions.find((b) => b.key === bordaKey) ?? null;
  const total = sizePrice + (selectedBorda?.price ?? 0);

  const handleAdd = () => {
    addItem({
      itemId: pizza.id,
      name: pizza.name,
      size: sizeLabel,
      unitPrice: sizePrice,
      borda: selectedBorda?.label,
      bordaPrice: selectedBorda?.price,
    });
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 backdrop-blur-sm sm:items-center"
      onClick={onClose}
    >
      <div
        className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-t-2xl border border-border bg-background-elevated p-6 shadow-2xl sm:rounded-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-5 flex items-start justify-between gap-4">
          <div>
            <h2 className="font-display text-2xl font-semibold text-foreground">{pizza.name}</h2>
            <p className="mt-1 text-sm leading-relaxed text-muted">{pizza.description}</p>
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

        {/* Tamanho */}
        <div className="mb-5">
          <h3 className="mb-2 text-xs font-semibold uppercase tracking-widest text-muted">Tamanho</h3>
          <div className="grid grid-cols-2 gap-3">
            {(["media", "grande"] as const).map((s) => (
              <button
                key={s}
                onClick={() => setSize(s)}
                className={`rounded-xl border px-4 py-3 text-left transition ${
                  size === s
                    ? "border-foreground bg-foreground/5"
                    : "border-border hover:border-foreground/40"
                }`}
              >
                <div className="font-medium text-foreground">{s === "media" ? "Média" : "Grande"}</div>
                <div className="text-sm text-muted">{formatPrice(pizza.prices[s])}</div>
              </button>
            ))}
          </div>
        </div>

        {/* Borda */}
        <div className="mb-6">
          <h3 className="mb-2 text-xs font-semibold uppercase tracking-widest text-muted">
            Borda recheada (opcional)
          </h3>
          <div className="max-h-48 space-y-2 overflow-y-auto pr-1">
            <label className={`flex cursor-pointer items-center justify-between rounded-lg border px-3 py-2 text-sm transition ${bordaKey === "none" ? "border-foreground bg-foreground/5" : "border-border hover:border-foreground/40"}`}>
              <span className="flex items-center gap-2">
                <input type="radio" name="borda" className="accent-foreground" checked={bordaKey === "none"} onChange={() => setBordaKey("none")} />
                Sem borda
              </span>
            </label>
            {bordaGroups.map((group) => (
              <div key={group.id}>
                <div className="mb-1 mt-2 text-xs text-muted">{group.title} · +{formatPrice(group.price)}</div>
                {group.options.map((opt) => {
                  const key = `${group.id}::${opt}`;
                  return (
                    <label
                      key={key}
                      className={`mb-2 flex cursor-pointer items-center justify-between rounded-lg border px-3 py-2 text-sm transition ${bordaKey === key ? "border-foreground bg-foreground/5" : "border-border hover:border-foreground/40"}`}
                    >
                      <span className="flex items-center gap-2">
                        <input type="radio" name="borda" className="accent-foreground" checked={bordaKey === key} onChange={() => setBordaKey(key)} />
                        {opt}
                      </span>
                      <span className="text-muted">+{formatPrice(group.price)}</span>
                    </label>
                  );
                })}
              </div>
            ))}
          </div>
        </div>

        <button
          onClick={handleAdd}
          className="flex w-full items-center justify-between rounded-xl bg-foreground px-5 py-3.5 font-semibold text-background transition hover:bg-gold-soft"
        >
          <span>Adicionar ao carrinho</span>
          <span>{formatPrice(total)}</span>
        </button>
      </div>
    </div>
  );
}
