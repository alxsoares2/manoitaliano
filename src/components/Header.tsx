"use client";

import { useCart } from "@/context/CartContext";

export default function Header() {
  const { totalItems, openCart } = useCart();

  return (
    <header className="sticky top-0 z-30 border-b border-border bg-background/90 backdrop-blur-md">
      <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-4 sm:px-6">
        <div className="flex flex-col leading-none">
          <span className="font-display text-2xl font-bold tracking-wide text-gold-soft sm:text-3xl">
            Basílico
          </span>
          <span className="text-[10px] uppercase tracking-[0.3em] text-muted sm:text-xs">
            Pizzas Artesanais
          </span>
        </div>

        <button
          onClick={openCart}
          className="relative flex items-center gap-2 rounded-full border border-gold/40 px-4 py-2 text-sm font-medium text-gold-soft transition hover:border-gold hover:bg-gold/10"
          aria-label="Abrir carrinho"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            className="h-5 w-5"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M3 3h1.5l1.6 11.2a1.5 1.5 0 0 0 1.5 1.3h9.6a1.5 1.5 0 0 0 1.48-1.24L20.5 7H6"
            />
            <circle cx="9" cy="20" r="1.2" fill="currentColor" />
            <circle cx="17" cy="20" r="1.2" fill="currentColor" />
          </svg>
          <span className="hidden sm:inline">Carrinho</span>
          {totalItems > 0 && (
            <span className="absolute -right-2 -top-2 flex h-5 min-w-5 items-center justify-center rounded-full bg-gold px-1 text-xs font-bold text-background">
              {totalItems}
            </span>
          )}
        </button>
      </div>
    </header>
  );
}
