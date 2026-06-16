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
        <section className="mb-10 text-center">
          <h1 className="font-display text-3xl font-bold text-gold-soft sm:text-4xl">
            Cardápio
          </h1>
          <p className="mx-auto mt-2 max-w-md text-sm text-muted">
            Pizzas artesanais, entradas e doces — feitos com ingredientes
            selecionados. Toque em um item para montar seu pedido.
          </p>
        </section>

        {loading ? (
          <p className="text-center text-sm text-muted">Carregando cardápio...</p>
        ) : (
          menu.map((category) => (
            <section key={category.id} id={category.id} className="mb-12 scroll-mt-32">
              <h2 className="mb-4 font-display text-2xl font-semibold text-gold-soft">
                {category.title}
              </h2>
              <div className="grid gap-3 sm:grid-cols-2">
                {category.items.map((item) => (
                  <MenuItemCard key={item.id} item={item} />
                ))}
              </div>
            </section>
          ))
        )}

        <section id="bordas" className="mb-12 scroll-mt-32">
          <h2 className="mb-2 font-display text-2xl font-semibold text-gold-soft">
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

      <CartSidebar />
    </>
  );
}
