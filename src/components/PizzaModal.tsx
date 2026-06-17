"use client";

import { useState } from "react";
import { PizzaItem } from "@/types/menu";
import { bordaGroups } from "@/data/menu";
import { useCart } from "@/context/CartContext";
import { formatPrice } from "@/lib/format";

export default function PizzaModal({
  pizza,
  siblingPizzas = [],
  onClose,
}: {
  pizza: PizzaItem;
  siblingPizzas?: PizzaItem[];
  onClose: () => void;
}) {
  const { addItem } = useCart();
  const [size, setSize] = useState<"media" | "grande">("media");
  const [bordaKey, setBordaKey] = useState<string>("none");
  const [secondId, setSecondId] = useState<string>("none");

  const sizeLabel = size === "media" ? "Média" : "Grande";
  const price1 = pizza.prices[size];
  const secondPizza = siblingPizzas.find((p) => p.id === secondId) ?? null;
  const price2 = secondPizza ? secondPizza.prices[size] : 0;

  const bordaOptions = bordaGroups.flatMap((group) =>
    group.options.map((opt) => ({ key: `${group.id}::${opt}`, label: opt, price: group.price }))
  );
  const selectedBorda = bordaKey === "none" ? null : bordaOptions.find((b) => b.key === bordaKey) ?? null;

  const basePrice = secondPizza ? (price1 + price2) / 2 : price1;
  const total = basePrice + (selectedBorda?.price ?? 0);

  const itemName = secondPizza
    ? `${pizza.name} / ${secondPizza.name}`
    : pizza.name;

  const handleAdd = () => {
    addItem({
      itemId: secondPizza ? `${pizza.id}+${secondPizza.id}` : pizza.id,
      name: itemName,
      size: sizeLabel,
      unitPrice: basePrice,
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
                  size === s ? "border-foreground bg-foreground/5" : "border-border hover:border-foreground/40"
                }`}
              >
                <div className="font-medium text-foreground">{s === "media" ? "Média" : "Grande"}</div>
                <div className="text-sm text-muted">{formatPrice(pizza.prices[s])}</div>
              </button>
            ))}
          </div>
        </div>

        {/* Segundo sabor */}
        {siblingPizzas.length > 0 && (
          <div className="mb-5">
            <h3 className="mb-2 text-xs font-semibold uppercase tracking-widest text-muted">
              Segundo sabor (opcional)
            </h3>
            <p className="mb-3 text-xs text-muted">
              Escolha outro sabor para dividir a pizza. O preço será a média dos dois sabores.
            </p>
            <div className="max-h-44 space-y-2 overflow-y-auto pr-1">
              <label className={`flex cursor-pointer items-center gap-2 rounded-lg border px-3 py-2 text-sm transition ${secondId === "none" ? "border-foreground bg-foreground/5" : "border-border hover:border-foreground/40"}`}>
                <input type="radio" name="second" className="accent-foreground" checked={secondId === "none"} onChange={() => setSecondId("none")} />
                <span className="text-foreground">Apenas {pizza.name}</span>
              </label>
              {siblingPizzas.map((p) => (
                <label
                  key={p.id}
                  className={`flex cursor-pointer items-center justify-between rounded-lg border px-3 py-2 text-sm transition ${secondId === p.id ? "border-foreground bg-foreground/5" : "border-border hover:border-foreground/40"}`}
                >
                  <span className="flex items-center gap-2">
                    <input type="radio" name="second" className="accent-foreground" checked={secondId === p.id} onChange={() => setSecondId(p.id)} />
                    <span className="text-foreground">{p.name}</span>
                  </span>
                  <span className="text-muted">{formatPrice((price1 + p.prices[size]) / 2)}</span>
                </label>
              ))}
            </div>
          </div>
        )}

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

        {/* Resumo e botão */}
        {secondPizza && (
          <div className="mb-3 rounded-lg bg-background px-4 py-2.5 text-sm">
            <span className="text-muted">Pizza: </span>
            <span className="font-medium text-foreground">{pizza.name} / {secondPizza.name} — {sizeLabel}</span>
          </div>
        )}

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
