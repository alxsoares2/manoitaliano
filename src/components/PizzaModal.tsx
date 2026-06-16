"use client";

import { useState } from "react";
import { PizzaItem } from "@/types/menu";
import { bordaGroups } from "@/data/menu";
import { useCart } from "@/context/CartContext";
import { formatPrice } from "@/lib/format";

export default function PizzaModal({
  pizza,
  onClose,
}: {
  pizza: PizzaItem;
  onClose: () => void;
}) {
  const { addItem } = useCart();
  const [size, setSize] = useState<"media" | "grande">("media");
  const [bordaKey, setBordaKey] = useState<string>("none");

  const sizeLabel = size === "media" ? "Média" : "Grande";
  const sizePrice = pizza.prices[size];

  const bordaOptions = bordaGroups.flatMap((group) =>
    group.options.map((opt) => ({
      key: `${group.id}::${opt}`,
      label: opt,
      price: group.price,
    }))
  );

  const selectedBorda =
    bordaKey === "none"
      ? null
      : bordaOptions.find((b) => b.key === bordaKey) ?? null;

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
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 backdrop-blur-sm sm:items-center"
      onClick={onClose}
    >
      <div
        className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-t-2xl border border-border bg-background-elevated p-6 shadow-2xl sm:rounded-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-start justify-between gap-4">
          <div>
            <h2 className="font-display text-2xl font-semibold text-gold-soft">
              {pizza.name}
            </h2>
            <p className="mt-1 text-sm text-muted">{pizza.description}</p>
          </div>
          <button
            onClick={onClose}
            className="shrink-0 rounded-full border border-border p-2 text-muted transition hover:border-gold hover:text-gold-soft"
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

        {/* Tamanho */}
        <div className="mb-5">
          <h3 className="mb-2 text-xs font-semibold uppercase tracking-widest text-gold">
            Tamanho
          </h3>
          <div className="grid grid-cols-2 gap-3">
            {(["media", "grande"] as const).map((s) => (
              <button
                key={s}
                onClick={() => setSize(s)}
                className={`rounded-xl border px-4 py-3 text-left transition ${
                  size === s
                    ? "border-gold bg-gold/10"
                    : "border-border hover:border-gold/50"
                }`}
              >
                <div className="font-medium">
                  {s === "media" ? "Média" : "Grande"}
                </div>
                <div className="text-sm text-muted">
                  {formatPrice(pizza.prices[s])}
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Borda */}
        <div className="mb-6">
          <h3 className="mb-2 text-xs font-semibold uppercase tracking-widest text-gold">
            Borda recheada (opcional)
          </h3>
          <div className="max-h-48 space-y-2 overflow-y-auto pr-1">
            <label
              className={`flex cursor-pointer items-center justify-between rounded-lg border px-3 py-2 text-sm transition ${
                bordaKey === "none"
                  ? "border-gold bg-gold/10"
                  : "border-border hover:border-gold/50"
              }`}
            >
              <span className="flex items-center gap-2">
                <input
                  type="radio"
                  name="borda"
                  className="accent-[var(--gold)]"
                  checked={bordaKey === "none"}
                  onChange={() => setBordaKey("none")}
                />
                Sem borda
              </span>
            </label>
            {bordaGroups.map((group) => (
              <div key={group.id}>
                <div className="mt-2 mb-1 text-xs text-muted">
                  {group.title} · +{formatPrice(group.price)}
                </div>
                {group.options.map((opt) => {
                  const key = `${group.id}::${opt}`;
                  return (
                    <label
                      key={key}
                      className={`mb-2 flex cursor-pointer items-center justify-between rounded-lg border px-3 py-2 text-sm transition ${
                        bordaKey === key
                          ? "border-gold bg-gold/10"
                          : "border-border hover:border-gold/50"
                      }`}
                    >
                      <span className="flex items-center gap-2">
                        <input
                          type="radio"
                          name="borda"
                          className="accent-[var(--gold)]"
                          checked={bordaKey === key}
                          onChange={() => setBordaKey(key)}
                        />
                        {opt}
                      </span>
                      <span className="text-muted">
                        +{formatPrice(group.price)}
                      </span>
                    </label>
                  );
                })}
              </div>
            ))}
          </div>
        </div>

        <button
          onClick={handleAdd}
          className="flex w-full items-center justify-between rounded-xl bg-gold px-5 py-3.5 font-semibold text-background transition hover:bg-gold-soft"
        >
          <span>Adicionar ao carrinho</span>
          <span>{formatPrice(total)}</span>
        </button>
      </div>
    </div>
  );
}
