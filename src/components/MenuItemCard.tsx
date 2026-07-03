"use client";

import { useState } from "react";
import { PizzaItem, SimpleItem } from "@/types/menu";
import { useCart } from "@/context/CartContext";
import { formatPrice } from "@/lib/format";
import PizzaModal from "./PizzaModal";
import SimpleItemModal from "./SimpleItemModal";

function ImageLightbox({ url, name, onClose }: { url: string; name: string; onClose: () => void }) {
  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4"
      onClick={onClose}
    >
      <button
        onClick={onClose}
        className="absolute right-4 top-4 rounded-full bg-white/10 p-2 text-white transition hover:bg-white/20"
        aria-label="Fechar"
      >
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="h-5 w-5">
          <path strokeLinecap="round" d="M6 6l12 12M18 6 6 18" />
        </svg>
      </button>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={url}
        alt={name}
        onClick={(e) => e.stopPropagation()}
        className="max-h-[85vh] max-w-full rounded-2xl object-contain shadow-2xl"
      />
      <p className="absolute bottom-6 left-0 right-0 text-center text-sm font-medium text-white/70">{name}</p>
    </div>
  );
}

function ItemThumb({ url, name }: { url?: string | null; name: string }) {
  const [lightbox, setLightbox] = useState(false);

  if (url) {
    return (
      <>
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); setLightbox(true); }}
          className="group/thumb relative shrink-0 overflow-hidden rounded-lg"
          aria-label={`Ver foto de ${name}`}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={url} alt={name} className="h-20 w-20 object-cover transition group-hover/thumb:scale-105" />
          <div className="absolute inset-0 flex items-center justify-center bg-black/0 transition group-hover/thumb:bg-black/30">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" className="h-5 w-5 opacity-0 drop-shadow transition group-hover/thumb:opacity-100">
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.35-4.35M17 11A6 6 0 1 1 5 11a6 6 0 0 1 12 0zm-2 2l2 2" />
              <path strokeLinecap="round" d="M11 8v6M8 11h6" />
            </svg>
          </div>
        </button>
        {lightbox && <ImageLightbox url={url} name={name} onClose={() => setLightbox(false)} />}
      </>
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

const cardClass =
  "group flex w-full items-center gap-4 rounded-xl border border-border bg-background-elevated p-3 shadow-sm transition hover:border-foreground/20 hover:shadow-md";

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
        <div className={cardClass}>
          <button
            onClick={() => !storeClosed && setModalOpen(true)}
            disabled={storeClosed}
            className="min-w-0 flex-1 text-left disabled:cursor-not-allowed disabled:opacity-50"
          >
            <h3 className="truncate font-display text-base font-semibold text-foreground">{item.name}</h3>
            <p className="mt-0.5 line-clamp-2 text-xs leading-relaxed text-muted">{item.description}</p>
            <span className="mt-1.5 block text-sm font-medium text-foreground">
              {formatPrice(item.prices.media)} / {formatPrice(item.prices.grande)}
            </span>
            <span className="mt-1 inline-block text-xs font-semibold uppercase tracking-widest text-gold-soft">
              Escolher tamanho →
            </span>
          </button>
          <ItemThumb url={item.image_url} name={item.name} />
        </div>
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
        <div className={cardClass}>
          <button
            onClick={() => !storeClosed && setModalOpen(true)}
            disabled={storeClosed}
            className="min-w-0 flex-1 text-left disabled:cursor-not-allowed disabled:opacity-50"
          >
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
          </button>
          <ItemThumb url={item.image_url} name={item.name} />
        </div>
        {modalOpen && <SimpleItemModal item={item} onClose={() => setModalOpen(false)} />}
      </>
    );
  }

  return (
    <div className={cardClass}>
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
