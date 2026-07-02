"use client";

import { useCart } from "@/context/CartContext";

export default function Header() {
  const { totalItems, openCart } = useCart();

  return (
    <header className="sticky top-0 z-30 border-b bg-white shadow-sm" style={{ borderColor: "#E8E8E4", height: "72px" }}>
      <div className="mx-auto flex h-full max-w-5xl items-center justify-between px-4 sm:px-6">
        {/* Logo + Nome */}
        <div className="flex items-center gap-3">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/logo.png"
            alt="Mano Italiano"
            className="w-auto object-contain"
            style={{ height: "56px" }}
            onError={(e) => {
              (e.currentTarget as HTMLImageElement).style.display = "none";
              const fallback = e.currentTarget.nextElementSibling as HTMLElement | null;
              if (fallback) fallback.style.display = "flex";
            }}
          />
          <div className="hidden flex-col leading-none sm:flex">
            <span className="font-display text-2xl" style={{ color: "#1A1A1A", fontFamily: "var(--font-display)", fontSize: "24px", fontWeight: 600 }}>
              mano italiano
            </span>
            <span style={{ fontFamily: "var(--font-body)", fontSize: "12px", letterSpacing: "0.2em", color: "#1A1A1A", fontWeight: 300 }}>
              cucina italiana
            </span>
          </div>
          {/* Fallback when logo fails */}
          <div className="hidden flex-col leading-none">
            <span className="font-display text-2xl font-semibold" style={{ color: "#1A1A1A" }}>mano italiano</span>
            <span style={{ fontFamily: "var(--font-body)", fontSize: "12px", letterSpacing: "0.2em", color: "#1A1A1A", fontWeight: 300 }}>cucina italiana</span>
          </div>
        </div>

        {/* Cart */}
        <button
          onClick={openCart}
          className="relative flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-medium transition hover:border-foreground"
          style={{ borderColor: "#E8E8E4", color: "#1A1A1A" }}
          aria-label="Abrir carrinho"
        >
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-5 w-5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M3 3h1.5l1.6 11.2a1.5 1.5 0 0 0 1.5 1.3h9.6a1.5 1.5 0 0 0 1.48-1.24L20.5 7H6" />
            <circle cx="9" cy="20" r="1.2" fill="currentColor" />
            <circle cx="17" cy="20" r="1.2" fill="currentColor" />
          </svg>
          <span className="hidden sm:inline">Carrinho</span>
          {totalItems > 0 && (
            <span className="absolute -right-2 -top-2 flex h-5 min-w-5 items-center justify-center rounded-full bg-foreground px-1 text-xs font-bold text-background">
              {totalItems}
            </span>
          )}
        </button>
      </div>
    </header>
  );
}
