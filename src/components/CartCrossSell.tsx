"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useCart } from "@/context/CartContext";
import { MenuItemRecord } from "@/types/menuItem";
import { SimpleItem } from "@/types/menu";
import { toMenuItem } from "@/lib/menuItems";
import { formatPrice } from "@/lib/format";
import SimpleItemModal from "./SimpleItemModal";

export default function CartCrossSell() {
  const { addItem } = useCart();
  const [drinks, setDrinks] = useState<MenuItemRecord[]>([]);
  const [nutella, setNutella] = useState<MenuItemRecord | null>(null);
  const [optionItem, setOptionItem] = useState<SimpleItem | null>(null);

  useEffect(() => {
    let active = true;

    supabase
      .from("menu_items")
      .select("*")
      .eq("category_id", "bebidas")
      .eq("is_active", true)
      .order("sort_order", { ascending: true })
      .then(({ data }) => {
        if (active && data) setDrinks(data as MenuItemRecord[]);
      });

    supabase
      .from("menu_items")
      .select("*")
      .eq("name", "Pizza Nutella Individual")
      .eq("is_active", true)
      .maybeSingle()
      .then(({ data }) => {
        if (active && data) setNutella(data as MenuItemRecord);
      });

    return () => {
      active = false;
    };
  }, []);

  const add = (item: MenuItemRecord) => {
    // Se a bebida tem sabores/opções, abre o modal para o cliente escolher.
    if (item.options && item.options.length > 0) {
      setOptionItem(toMenuItem(item) as SimpleItem);
      return;
    }
    addItem({ itemId: item.id, name: item.name, unitPrice: item.price ?? 0 });
  };

  if (drinks.length === 0 && !nutella) return null;

  return (
    <div className="mt-5 space-y-5">
      {/* Bebidas */}
      {drinks.length > 0 && (
        <div className="rounded-xl border border-border bg-background p-4">
          <p className="mb-3 text-sm font-semibold text-foreground">Adicionar bebida? 🥤</p>
          <div className="space-y-2">
            {drinks.map((d) => (
              <div key={d.id} className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate text-sm text-foreground">{d.name}</p>
                  <p className="text-xs text-muted">{formatPrice(d.price ?? 0)}</p>
                </div>
                <button
                  onClick={() => add(d)}
                  className="shrink-0 rounded-full border border-foreground px-4 py-1 text-xs font-semibold uppercase tracking-widest text-foreground transition hover:bg-foreground hover:text-background"
                >
                  Adicionar
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Pizza Nutella */}
      {nutella && (
        <div className="rounded-xl border border-gold-soft/30 bg-gold-soft/5 p-4">
          <p className="mb-3 text-sm font-semibold text-foreground">Encerre com chave de ouro! 🍫</p>
          <div className="flex items-center gap-3">
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-foreground">{nutella.name}</p>
              {nutella.description && (
                <p className="mt-0.5 line-clamp-2 text-xs text-muted">{nutella.description}</p>
              )}
              <p className="mt-1 text-sm font-medium text-foreground">{formatPrice(nutella.price ?? 0)}</p>
            </div>
            <button
              onClick={() => add(nutella)}
              className="shrink-0 rounded-full bg-foreground px-5 py-2 text-xs font-semibold uppercase tracking-widest text-background transition hover:bg-gold-soft"
            >
              Adicionar
            </button>
          </div>
        </div>
      )}

      {optionItem && (
        <SimpleItemModal item={optionItem} onClose={() => setOptionItem(null)} />
      )}
    </div>
  );
}
