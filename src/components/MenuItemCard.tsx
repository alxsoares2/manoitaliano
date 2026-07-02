"use client";

import { useState } from "react";
import { PizzaItem, SimpleItem } from "@/types/menu";
import { useCart } from "@/context/CartContext";
import { formatPrice } from "@/lib/format";
import PizzaModal from "./PizzaModal";
import SimpleItemModal from "./SimpleItemModal";

function ItemThumb({ url, name }: { url?: string | null; name: string }) {
  if (url) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={url}
        alt={name}
        className="h-20 w-20 shrink-0 rounded-lg object-cover"
      />
    );
  }
  return (
    <div
      className="flex h-20 w-20 shrink-0 items-center justify-center rounded-lg"
      style={{ backgroundColor: "#F5F5F0" }}
    >
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" fill="none" className="h-8 w-8 opacity-30">
        <circle cx="32" cy="32" r="28" stroke="#888" strokeWidth="2.5" />
        <path d="M32 14c-9.94 0-18 8.06-18 18s8.06 18 18 18 18-8.06 18-18S41.94 14 32 14z" fill="#888" fillOpacity=".15" stroke="#888" strokeWidth="2" />
        <circle cx="26" cy="28" r="2.5" fill="#888" />
        <circle cx="38" cy="26" r="2" fill="#888" />
        <circle cx="33" cy="37" r="2" fill="#888" />
      </svg>
    </div>
  );
}

const rowClass =
  "group flex w-full items-center gap-4 rounded-xl border border-border bg-background-elevated p-3 text-left shadow-sm transition hover:border-foreground/20 hover:shadow-md";

export default function MenuItemCard({
  item,
  siblingPizzas = [],
  storeClosed = false,
}: {
  item: PizzaItem | SimpleItem;
  siblingPizzas?: PizzaItem[];
  storeClosed?: boolean;
}) {
  const { addItem } = useCart();
  const [modalOpen, setModalOpen] = useState(false);

  if (item.kind === "pizza") {
    return (
      <>
        <button onClick={() => !storeClosed && setModalOpen(true)} disabled={storeClosed} className={`${rowClass} disabled:cursor-not-allowed disabled:opacity-50`}>
          <div className="min-w-0 flex-1">
            <h3 className="truncate font-display text-base font-semibold text-foreground">{item.name}</h3>
            <p className="mt-0.5 line-clamp-2 text-xs leading-relaxed text-muted">{item.description}</p>
            <span className="mt-1.5 block text-sm font-medium text-foreground">
              {formatPrice(item.prices.media)} / {formatPrice(item.prices.grande)}
            </span>
            <span className="mt-1 inline-block text-xs font-semibold uppercase tracking-widest text-gold-soft">
              Escolher tamanho →
            </span>
          </div>
          <ItemThumb url={item.image_url} name={item.name} />
        </button>
        {modalOpen && (
          <PizzaModal pizza={item} siblingPizzas={siblingPizzas} onClose={() => setModalOpen(false)} />
        )}
      </>
    );
  }

  if (item.options) {
    const sp = item.sizesPrices;
    const sizePrices = sp ? [sp.executivo, sp.individual, sp.duplo].filter((p): p is number => p != null) : [];
    const displayPrice = sizePrices.length > 0 ? Math.min(...sizePrices) : item.price;
    const hasSizes = sizePrices.length > 0;

    return (
      <>
        <button onClick={() => !storeClosed && setModalOpen(true)} disabled={storeClosed} className={`${rowClass} disabled:cursor-not-allowed disabled:opacity-50`}>
          <div className="min-w-0 flex-1">
            <h3 className="truncate font-display text-base font-semibold text-foreground">{item.name}</h3>
            {item.description && (
              <p className="mt-0.5 line-clamp-2 text-xs leading-relaxed text-muted">{item.description}</p>
            )}
            <span className="mt-1.5 block text-sm font-medium text-foreground">
              {hasSizes ? `A partir de ${formatPrice(displayPrice)}` : formatPrice(displayPrice)}
            </span>
            <span className="mt-1 inline-block text-xs font-semibold uppercase tracking-widest text-gold-soft">
              {hasSizes ? "Escolher tamanho →" : "Escolher opção →"}
            </span>
          </div>
          <ItemThumb url={item.image_url} name={item.name} />
        </button>
        {modalOpen && <SimpleItemModal item={item} onClose={() => setModalOpen(false)} />}
      </>
    );
  }

  return (
    <div className="flex w-full items-center gap-4 rounded-xl border border-border bg-background-elevated p-3 shadow-sm">
      <div className="min-w-0 flex-1">
        <h3 className="truncate font-display text-base font-semibold text-foreground">{item.name}</h3>
        {item.description && (
          <p className="mt-0.5 line-clamp-2 text-xs leading-relaxed text-muted">{item.description}</p>
        )}
        <span className="mt-1.5 block text-sm font-medium text-foreground">{formatPrice(item.price)}</span>
        <button
          onClick={() => addItem({ itemId: item.id, name: item.name, unitPrice: item.price })}
          disabled={storeClosed}
          className="mt-1.5 rounded-full border border-foreground px-4 py-1 text-xs font-semibold uppercase tracking-widest text-foreground transition hover:bg-foreground hover:text-background disabled:cursor-not-allowed disabled:opacity-40"
        >
          Adicionar
        </button>
      </div>
      <ItemThumb url={item.image_url} name={item.name} />
    </div>
  );
}
