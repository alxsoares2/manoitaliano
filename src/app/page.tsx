"use client";

import { useEffect, useState } from "react";
import Header from "@/components/Header";
import CategoryNav from "@/components/CategoryNav";
import MenuItemCard from "@/components/MenuItemCard";
import CartSidebar from "@/components/CartSidebar";
import StoreStatusBanner from "@/components/StoreStatusBanner";
import { StoreStatusProvider, useStoreStatus } from "@/context/StoreStatusContext";
import { supabase } from "@/lib/supabase";
import { MenuItemRecord } from "@/types/menuItem";
import { groupActiveItemsByCategory } from "@/lib/menuItems";

function HomeContent() {
  const [items, setItems] = useState<MenuItemRecord[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;

    supabase
      .from("menu_items")
      .select("*")
      .then(({ data }) => {
        if (active && data) setItems(data as MenuItemRecord[]);
        if (active) setLoading(false);
      });

    const channel = supabase
      .channel("menu-items-changes")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "menu_items" },
        () => {
          supabase
            .from("menu_items")
            .select("*")
            .then(({ data }) => {
              if (active && data) setItems(data as MenuItemRecord[]);
            });
        }
      )
      .subscribe();

    return () => {
      active = false;
      supabase.removeChannel(channel);
    };
  }, []);

  const menu = groupActiveItemsByCategory(items);
  const allPizzas = menu.flatMap((c) => c.items.filter((i) => i.kind === "pizza")) as import("@/types/menu").PizzaItem[];

  const { open, loading: statusLoading } = useStoreStatus();
  const storeClosed = !statusLoading && !open;

  return (
    <>
      <StoreStatusBanner />
      <Header />

      {/* Hero */}
      <section
        className="relative overflow-hidden"
        style={{ backgroundColor: "#1A1A1A" }}
      >
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 opacity-20"
          style={{
            backgroundImage:
              "radial-gradient(circle at 20% 20%, #3D5A2A 0%, transparent 45%), radial-gradient(circle at 85% 80%, #3D5A2A 0%, transparent 40%)",
          }}
        />
        <div className="relative mx-auto flex max-w-5xl flex-col items-center px-4 py-16 text-center sm:px-6 sm:py-24">
          <span className="mb-4 text-xs font-semibold uppercase tracking-[0.3em] text-white/60">
            Basílico Pizzas
          </span>
          <h1
            className="text-4xl font-bold text-white sm:text-6xl"
            style={{ fontFamily: "var(--font-display)" }}
          >
            Peça Agora!
          </h1>
          <p
            className="mt-4 max-w-md text-base leading-relaxed text-white/70 sm:text-lg"
            style={{ fontFamily: "var(--font-body)" }}
          >
            Pizza artesanal direto da nossa cozinha
          </p>
          <a
            href="#cardapio"
            className="mt-8 rounded-full bg-white px-8 py-3.5 text-sm font-semibold uppercase tracking-widest text-[#1A1A1A] transition hover:bg-gold-soft hover:text-white"
          >
            Ver Cardápio
          </a>
        </div>
      </section>

      <CategoryNav
        categories={menu.map((c) => ({ id: c.id, title: c.title }))}
      />

      <main className="mx-auto w-full max-w-5xl flex-1 px-4 pb-24 pt-8 sm:px-6">
        <section id="cardapio" className="mb-12 scroll-mt-32 text-center">
          <h2 className="font-display text-3xl font-bold text-foreground sm:text-4xl">
            Cardápio
          </h2>
          <p className="mx-auto mt-3 max-w-md text-sm leading-relaxed text-muted">
            Pizzas artesanais, entradas e doces — feitos com ingredientes
            selecionados. Toque em um item para montar seu pedido.
          </p>
        </section>

        {loading ? (
          <p className="text-center text-sm text-muted">Carregando cardápio...</p>
        ) : (
          menu.map((category) => (
            <section key={category.id} id={category.id} className="mb-14 scroll-mt-32">
              <h2 className="mb-5 font-display text-2xl font-semibold text-foreground">
                {category.title}
              </h2>
              <div className="grid gap-3 sm:grid-cols-2">
                {category.items.map((item) => (
                  <MenuItemCard
                    key={item.id}
                    item={item}
                    siblingPizzas={
                      item.kind === "pizza"
                        ? allPizzas.filter((p) => p.id !== item.id)
                        : []
                    }
                    storeClosed={storeClosed}
                  />
                ))}
              </div>
            </section>
          ))
        )}
      </main>

      <footer className="border-t border-border bg-background-elevated py-16">
        <div className="mx-auto max-w-5xl px-4 sm:px-6">
          <div className="mb-10 flex flex-col items-center gap-3 text-center">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/logo.png" alt="Basílico Pizzas" className="h-16 w-auto object-contain opacity-80" />
            <p className="max-w-sm text-sm leading-relaxed text-muted">
              Pizzas artesanais com massa de longa fermentação natural — 48 horas de maturação para garantir leveza e sabor autêntico.
            </p>
          </div>

          <div className="grid gap-8 border-t border-border pt-10 sm:grid-cols-4">
            <div className="flex flex-col gap-2">
              <h3 className="text-xs font-semibold uppercase tracking-widest text-muted">Endereço</h3>
              <p className="text-sm leading-relaxed text-foreground">
                Av. Bananeiras, 190<br />Manaíra, João Pessoa/PB
              </p>
            </div>
            <div className="flex flex-col gap-2">
              <h3 className="text-xs font-semibold uppercase tracking-widest text-muted">Nossa massa</h3>
              <p className="text-sm leading-relaxed text-foreground">
                Fermentação natural de 48h, ingredientes frescos e selecionados.
              </p>
            </div>
            <div className="flex flex-col gap-2">
              <h3 className="text-xs font-semibold uppercase tracking-widest text-muted">WhatsApp</h3>
              <a href="https://wa.me/5583993228832" target="_blank" rel="noopener noreferrer" className="text-sm text-foreground transition hover:text-gold-soft">
                (83) 99322-8832
              </a>
            </div>
            <div className="flex flex-col gap-2">
              <h3 className="text-xs font-semibold uppercase tracking-widest text-muted">Instagram</h3>
              <a href="https://instagram.com/basilicopizzas" target="_blank" rel="noopener noreferrer" className="text-sm text-foreground transition hover:text-gold-soft">
                @basilicopizzas
              </a>
            </div>
          </div>

          <div className="mt-10 flex flex-col items-center gap-2 text-center text-xs text-muted">
            <p>© {new Date().getFullYear()} Basílico Pizzas · Delivery premium em João Pessoa</p>
            <a href="/politica-de-privacidade" className="underline transition hover:text-foreground">
              Política de Privacidade
            </a>
          </div>
        </div>
      </footer>

      <CartSidebar storeClosed={storeClosed} />
    </>
  );
}

export default function Home() {
  return (
    <StoreStatusProvider>
      <HomeContent />
    </StoreStatusProvider>
  );
}
