"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { MENU_CATEGORIES } from "@/data/menuCategories";
import { MenuItemRecord } from "@/types/menuItem";
import MenuItemAdminCard from "./MenuItemAdminCard";
import MenuItemModal from "./MenuItemModal";

export default function MenuManagement() {
  const [items, setItems] = useState<MenuItemRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingItem, setEditingItem] = useState<MenuItemRecord | null | undefined>(
    undefined
  );

  useEffect(() => {
    let active = true;

    const fetchItems = () =>
      supabase
        .from("menu_items")
        .select("*")
        .order("category_id", { ascending: true })
        .order("sort_order", { ascending: true })
        .then(({ data }) => {
          if (active && data) setItems(data as MenuItemRecord[]);
          if (active) setLoading(false);
        });

    fetchItems();

    const channel = supabase
      .channel("menu-items-admin-changes")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "menu_items" },
        () => fetchItems()
      )
      .subscribe();

    return () => {
      active = false;
      supabase.removeChannel(channel);
    };
  }, []);

  const handleToggleActive = async (item: MenuItemRecord) => {
    const is_active = !item.is_active;
    setItems((prev) =>
      prev.map((i) => (i.id === item.id ? { ...i, is_active } : i))
    );
    await supabase.from("menu_items").update({ is_active }).eq("id", item.id);
  };

  if (loading) {
    return <p className="text-center text-sm text-muted">Carregando cardápio...</p>;
  }

  return (
    <>
      <div className="mb-6 flex items-center justify-end">
        <button
          onClick={() => setEditingItem(null)}
          className="rounded-full bg-gold px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-gold-soft"
        >
          + Adicionar Item
        </button>
      </div>

      {MENU_CATEGORIES.map((category) => {
        const categoryItems = items.filter((item) => item.category_id === category.id);
        if (categoryItems.length === 0) return null;

        return (
          <section key={category.id} className="mb-8">
            <h2 className="mb-3 text-lg font-semibold text-foreground">
              {category.title}
            </h2>
            <div className="grid gap-3 sm:grid-cols-2">
              {categoryItems.map((item) => (
                <MenuItemAdminCard
                  key={item.id}
                  item={item}
                  onToggleActive={handleToggleActive}
                  onEdit={setEditingItem}
                  onImageUploaded={(id, url) =>
                    setItems((prev) => prev.map((i) => i.id === id ? { ...i, image_url: url } : i))
                  }
                />
              ))}
            </div>
          </section>
        );
      })}

      {editingItem !== undefined && (
        <MenuItemModal item={editingItem} onClose={() => setEditingItem(undefined)} />
      )}
    </>
  );
}
