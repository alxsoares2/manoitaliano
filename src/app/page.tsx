"use client";

import { useEffect, useState } from "react";
import Header from "@/components/Header";
import CategoryNav from "@/components/CategoryNav";
import MenuItemCard from "@/components/MenuItemCard";
import CartSidebar from "@/components/CartSidebar";
import { bordaGroups } from "@/data/menu";
import { formatPrice } from "@/lib/format";
import { supabase } from "@/lib/supabase";
import { MenuItemRecord } from "@/types/menuItem";
import { groupActiveItemsByCategory } from "@/lib/menuItems";

export default function Home() {
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

  return (
    <>
      <Header />
      <CategoryNav
        categories={[
          ...menu.map((c) => ({ id: c.id, title: c.title })),
          { id: "bordas", title: "Bordas Recheadas" },
        ]}
      />

      <main className="mx-auto w-full max-w-5xl flex-1 px-4 pb-24 pt-8 sm:px-6">
        <section className="mb-12 text-center">
          <h1 className="font-display text-3xl font-bold text-foreground sm:text-4xl">
            Cardápio
          </h1>
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
                        ? (category.items.filter((i) => i.kind === "pizza" && i.id !== item.id) as import("@/types/menu").PizzaItem[])
                        : []
                    }
                  />
                ))}
              </div>
            </section>
          ))
        )}

        <section id="bordas" className="mb-14 scroll-mt-32">
          <h2 className="mb-2 font-display text-2xl font-semibold text-foreground">
            Bordas Recheadas
          </h2>
          <p className="mb-4 text-sm text-muted">
            Disponíveis para adicionar à sua pizza durante o pedido.
          </p>
          <div className="grid gap-3 sm:grid-cols-3">
            {bordaGroups.map((group) => (
              <div
                key={group.id}
                className="rounded-xl border border-border bg-background-elevated p-4"
              >
                <div className="flex items-baseline justify-between gap-2">
                  <h3 className="font-display text-lg font-semibold text-foreground">
                    {group.title}
                  </h3>
                  <span className="shrink-0 text-sm font-medium text-gold">
                    {formatPrice(group.price)}
                  </span>
                </div>
                <ul className="mt-2 space-y-1 text-sm text-muted">
                  {group.options.map((opt) => (
                    <li key={opt}>{opt}</li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </section>
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

          <p className="mt-10 text-center text-xs text-muted">
            © {new Date().getFullYear()} Basílico Pizzas · Delivery premium em João Pessoa
          </p>
        </div>
      </footer>

      <CartSidebar />
    </>
  );
}
