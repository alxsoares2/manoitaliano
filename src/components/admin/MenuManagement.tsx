"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { MenuItemRecord } from "@/types/menuItem";
import MenuItemAdminCard from "./MenuItemAdminCard";
import MenuItemModal from "./MenuItemModal";

type Category = { id: string; title: string; sort_order: number };

export default function MenuManagement() {
  const [items, setItems] = useState<MenuItemRecord[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingItem, setEditingItem] = useState<MenuItemRecord | null | undefined>(undefined);
  const [deleteTarget, setDeleteTarget] = useState<MenuItemRecord | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Gestão de categorias
  const [editCatId, setEditCatId] = useState<string | null>(null);
  const [editCatTitle, setEditCatTitle] = useState("");
  const [newCatTitle, setNewCatTitle] = useState("");
  const [savingCat, setSavingCat] = useState(false);
  const [catError, setCatError] = useState<string | null>(null);
  const [showCatManager, setShowCatManager] = useState(false);

  const fetchCategories = async () => {
    const res = await fetch("/api/admin/menu-categories");
    const json = await res.json();
    setCategories(json.categories ?? []);
  };

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
    fetchCategories();

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

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    await supabase.from("menu_items").delete().eq("id", deleteTarget.id);
    setItems((prev) => prev.filter((i) => i.id !== deleteTarget.id));
    setDeleteTarget(null);
    setDeleting(false);
  };

  const handleToggleActive = async (item: MenuItemRecord) => {
    const is_active = !item.is_active;
    setItems((prev) => prev.map((i) => (i.id === item.id ? { ...i, is_active } : i)));
    await supabase.from("menu_items").update({ is_active }).eq("id", item.id);
  };

  const handleCreateCategory = async () => {
    if (!newCatTitle.trim()) return;
    setSavingCat(true);
    setCatError(null);
    const res = await fetch("/api/admin/menu-categories", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: newCatTitle }),
    });
    setSavingCat(false);
    if (!res.ok) {
      const j = await res.json();
      setCatError(j.error ?? "Erro ao criar");
      return;
    }
    setNewCatTitle("");
    fetchCategories();
  };

  const handleRenameCategory = async (id: string) => {
    if (!editCatTitle.trim()) return;
    setSavingCat(true);
    setCatError(null);
    await fetch(`/api/admin/menu-categories/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: editCatTitle }),
    });
    setSavingCat(false);
    setEditCatId(null);
    fetchCategories();
  };

  const handleDeleteCategory = async (id: string) => {
    setSavingCat(true);
    setCatError(null);
    const res = await fetch(`/api/admin/menu-categories/${id}`, { method: "DELETE" });
    setSavingCat(false);
    if (!res.ok) {
      const j = await res.json();
      setCatError(j.error ?? "Erro ao excluir");
      return;
    }
    fetchCategories();
  };

  const handleMoveCategory = async (index: number, direction: "up" | "down") => {
    const swapIndex = direction === "up" ? index - 1 : index + 1;
    if (swapIndex < 0 || swapIndex >= categories.length) return;
    const a = categories[index];
    const b = categories[swapIndex];
    await Promise.all([
      fetch(`/api/admin/menu-categories/${a.id}`, {
        method: "PATCH", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sort_order: b.sort_order }),
      }),
      fetch(`/api/admin/menu-categories/${b.id}`, {
        method: "PATCH", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sort_order: a.sort_order }),
      }),
    ]);
    fetchCategories();
  };

  if (loading) {
    return <p className="text-center text-sm text-muted">Carregando cardápio...</p>;
  }

  return (
    <>
      <div className="mb-6 flex items-center justify-between gap-3">
        <button
          onClick={() => setShowCatManager((v) => !v)}
          className="rounded-full border border-border bg-background-elevated px-5 py-2.5 text-sm font-semibold text-muted transition hover:border-gold hover:text-gold"
        >
          {showCatManager ? "Fechar categorias" : "Gerenciar Categorias"}
        </button>
        <button
          onClick={() => setEditingItem(null)}
          className="rounded-full bg-gold px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-gold-soft"
        >
          + Adicionar Item
        </button>
      </div>

      {/* Gestão de categorias */}
      {showCatManager && (
        <div className="mb-6 rounded-2xl border border-border bg-background-elevated p-5">
          <h3 className="mb-4 font-semibold text-foreground">Categorias do Cardápio</h3>

          <div className="space-y-2">
            {categories.map((cat, idx) => (
              <div key={cat.id} className="flex items-center gap-2 rounded-lg border border-border px-3 py-2">
                {/* Setas de reordenação */}
                <div className="flex flex-col">
                  <button onClick={() => handleMoveCategory(idx, "up")} disabled={idx === 0} className="text-muted hover:text-gold disabled:opacity-20" title="Mover para cima">
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="h-3.5 w-3.5"><path strokeLinecap="round" strokeLinejoin="round" d="M5 15l7-7 7 7" /></svg>
                  </button>
                  <button onClick={() => handleMoveCategory(idx, "down")} disabled={idx === categories.length - 1} className="text-muted hover:text-gold disabled:opacity-20" title="Mover para baixo">
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="h-3.5 w-3.5"><path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" /></svg>
                  </button>
                </div>
                {editCatId === cat.id ? (
                  <>
                    <input
                      type="text"
                      value={editCatTitle}
                      onChange={(e) => setEditCatTitle(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && handleRenameCategory(cat.id)}
                      className="flex-1 rounded-lg border border-border bg-background px-2 py-1 text-sm text-foreground outline-none focus:border-gold"
                      autoFocus
                    />
                    <button
                      onClick={() => handleRenameCategory(cat.id)}
                      disabled={savingCat}
                      className="rounded-lg bg-gold px-3 py-1 text-xs font-semibold text-white"
                    >
                      Salvar
                    </button>
                    <button
                      onClick={() => setEditCatId(null)}
                      className="rounded-lg px-3 py-1 text-xs text-muted hover:text-foreground"
                    >
                      Cancelar
                    </button>
                  </>
                ) : (
                  <>
                    <span className="flex-1 text-sm font-medium text-foreground">{cat.title}</span>
                    <span className="text-xs text-muted">{cat.id}</span>
                    <button
                      onClick={() => { setEditCatId(cat.id); setEditCatTitle(cat.title); }}
                      className="rounded-lg p-1 text-muted hover:text-gold"
                      title="Renomear"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-4 w-4">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                      </svg>
                    </button>
                    <button
                      onClick={() => handleDeleteCategory(cat.id)}
                      className="rounded-lg p-1 text-muted hover:text-red-500"
                      title="Excluir"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-4 w-4">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </>
                )}
              </div>
            ))}
          </div>

          {/* Adicionar nova categoria */}
          <div className="mt-3 flex items-center gap-2">
            <input
              type="text"
              value={newCatTitle}
              onChange={(e) => setNewCatTitle(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleCreateCategory()}
              placeholder="Nova categoria..."
              className="flex-1 rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground outline-none focus:border-gold"
            />
            <button
              onClick={handleCreateCategory}
              disabled={savingCat || !newCatTitle.trim()}
              className="rounded-lg bg-gold px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
            >
              Criar
            </button>
          </div>

          {catError && <p className="mt-2 text-xs text-red-500">{catError}</p>}
        </div>
      )}

      {/* Itens por categoria */}
      {categories.map((category) => {
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
                  onDelete={setDeleteTarget}
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
        <MenuItemModal item={editingItem} categories={categories} onClose={() => setEditingItem(undefined)} />
      )}

      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-sm rounded-2xl bg-background-elevated p-6 shadow-xl">
            <h3 className="mb-2 text-lg font-semibold text-foreground">Excluir item?</h3>
            <p className="mb-5 text-sm text-muted">
              Tem certeza que deseja excluir <span className="font-medium text-foreground">{deleteTarget.name}</span>? Esta ação não pode ser desfeita.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setDeleteTarget(null)}
                className="flex-1 rounded-xl border border-border py-2.5 text-sm font-medium text-muted transition hover:border-foreground hover:text-foreground"
              >
                Cancelar
              </button>
              <button
                onClick={handleDelete}
                disabled={deleting}
                className="flex-1 rounded-xl bg-red-600 py-2.5 text-sm font-semibold text-white transition hover:bg-red-700 disabled:opacity-60"
              >
                {deleting ? "Excluindo..." : "Excluir"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
