"use client";

import { useState } from "react";
import { PizzaItem, SimpleItem } from "@/types/menu";
import { useCart } from "@/context/CartContext";
import { formatPrice } from "@/lib/format";
import PizzaModal from "./PizzaModal";
import SimpleItemModal from "./SimpleItemModal";

export default function MenuItemCard({
  item,
}: {
  item: PizzaItem | SimpleItem;
}) {
  const { addItem } = useCart();
  const [modalOpen, setModalOpen] = useState(false);

  if (item.kind === "pizza") {
    return (
      <>
        <button
          onClick={() => setModalOpen(true)}
          className="group flex w-full flex-col rounded-xl border border-border bg-background-elevated p-4 text-left transition hover:border-gold/60 hover:shadow-lg hover:shadow-gold/5"
        >
          <div className="flex items-baseline justify-between gap-3">
            <h3 className="font-display text-lg font-semibold text-foreground group-hover:text-gold-soft">
              {item.name}
            </h3>
            <span className="shrink-0 text-sm font-medium text-gold">
              {formatPrice(item.prices.media)} / {formatPrice(item.prices.grande)}
            </span>
          </div>
          <p className="mt-1.5 text-sm text-muted">{item.description}</p>
          <span className="mt-3 text-xs font-semibold uppercase tracking-widest text-gold-soft">
            Escolher tamanho →
          </span>
        </button>
        {modalOpen && (
          <PizzaModal pizza={item} onClose={() => setModalOpen(false)} />
        )}
      </>
    );
  }

  // Simple item
  if (item.options) {
    return (
      <>
        <button
          onClick={() => setModalOpen(true)}
          className="group flex w-full flex-col rounded-xl border border-border bg-background-elevated p-4 text-left transition hover:border-gold/60 hover:shadow-lg hover:shadow-gold/5"
        >
          <div className="flex items-baseline justify-between gap-3">
            <h3 className="font-display text-lg font-semibold text-foreground group-hover:text-gold-soft">
              {item.name}
            </h3>
            <span className="shrink-0 text-sm font-medium text-gold">
              {formatPrice(item.price)}
            </span>
          </div>
          {item.description && (
            <p className="mt-1.5 text-sm text-muted">{item.description}</p>
          )}
          <span className="mt-3 text-xs font-semibold uppercase tracking-widest text-gold-soft">
            Escolher opção →
          </span>
        </button>
        {modalOpen && (
          <SimpleItemModal item={item} onClose={() => setModalOpen(false)} />
        )}
      </>
    );
  }

  return (
    <div className="flex w-full flex-col rounded-xl border border-border bg-background-elevated p-4">
      <div className="flex items-baseline justify-between gap-3">
        <h3 className="font-display text-lg font-semibold text-foreground">
          {item.name}
        </h3>
        <span className="shrink-0 text-sm font-medium text-gold">
          {formatPrice(item.price)}
        </span>
      </div>
      {item.description && (
        <p className="mt-1.5 text-sm text-muted">{item.description}</p>
      )}
      <button
        onClick={() =>
          addItem({ itemId: item.id, name: item.name, unitPrice: item.price })
        }
        className="mt-3 self-start rounded-full border border-gold/40 px-4 py-1.5 text-xs font-semibold uppercase tracking-widest text-gold-soft transition hover:border-gold hover:bg-gold/10"
      >
        Adicionar
      </button>
    </div>
  );
}
