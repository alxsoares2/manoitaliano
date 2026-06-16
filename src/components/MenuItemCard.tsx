"use client";

import { useState } from "react";
import { PizzaItem, SimpleItem } from "@/types/menu";
import { useCart } from "@/context/CartContext";
import { formatPrice } from "@/lib/format";
import PizzaModal from "./PizzaModal";
import SimpleItemModal from "./SimpleItemModal";

function ItemImage({ url, name }: { url?: string | null; name: string }) {
  if (url) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={url}
        alt={name}
        className="mb-4 h-40 w-full rounded-lg object-cover"
      />
    );
  }
  return null;
}

export default function MenuItemCard({ item }: { item: PizzaItem | SimpleItem }) {
  const { addItem } = useCart();
  const [modalOpen, setModalOpen] = useState(false);

  if (item.kind === "pizza") {
    return (
      <>
        <button
          onClick={() => setModalOpen(true)}
          className="group flex w-full flex-col rounded-xl border border-border bg-background-elevated p-5 text-left shadow-sm transition hover:border-foreground/20 hover:shadow-md"
        >
          <ItemImage url={item.image_url} name={item.name} />
          <div className="flex items-baseline justify-between gap-3">
            <h3 className="font-display text-lg font-semibold text-foreground">{item.name}</h3>
            <span className="shrink-0 text-sm font-medium text-muted">
              {formatPrice(item.prices.media)} / {formatPrice(item.prices.grande)}
            </span>
          </div>
          <p className="mt-1.5 text-sm leading-relaxed text-muted">{item.description}</p>
          <span className="mt-4 text-xs font-semibold uppercase tracking-widest text-gold-soft">
            Escolher tamanho →
          </span>
        </button>
        {modalOpen && <PizzaModal pizza={item} onClose={() => setModalOpen(false)} />}
      </>
    );
  }

  if (item.options) {
    return (
      <>
        <button
          onClick={() => setModalOpen(true)}
          className="group flex w-full flex-col rounded-xl border border-border bg-background-elevated p-5 text-left shadow-sm transition hover:border-foreground/20 hover:shadow-md"
        >
          <ItemImage url={item.image_url} name={item.name} />
          <div className="flex items-baseline justify-between gap-3">
            <h3 className="font-display text-lg font-semibold text-foreground">{item.name}</h3>
            <span className="shrink-0 text-sm font-medium text-muted">{formatPrice(item.price)}</span>
          </div>
          {item.description && (
            <p className="mt-1.5 text-sm leading-relaxed text-muted">{item.description}</p>
          )}
          <span className="mt-4 text-xs font-semibold uppercase tracking-widest text-gold-soft">
            Escolher opção →
          </span>
        </button>
        {modalOpen && <SimpleItemModal item={item} onClose={() => setModalOpen(false)} />}
      </>
    );
  }

  return (
    <div className="flex w-full flex-col rounded-xl border border-border bg-background-elevated p-5 shadow-sm">
      <ItemImage url={item.image_url} name={item.name} />
      <div className="flex items-baseline justify-between gap-3">
        <h3 className="font-display text-lg font-semibold text-foreground">{item.name}</h3>
        <span className="shrink-0 text-sm font-medium text-muted">{formatPrice(item.price)}</span>
      </div>
      {item.description && (
        <p className="mt-1.5 text-sm leading-relaxed text-muted">{item.description}</p>
      )}
      <button
        onClick={() => addItem({ itemId: item.id, name: item.name, unitPrice: item.price })}
        className="mt-4 self-start rounded-full border border-foreground px-5 py-1.5 text-xs font-semibold uppercase tracking-widest text-foreground transition hover:bg-foreground hover:text-background"
      >
        Adicionar
      </button>
    </div>
  );
}
