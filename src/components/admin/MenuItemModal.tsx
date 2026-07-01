"use client";

import { FormEvent, useState } from "react";
import { MenuItemKind, MenuItemRecord } from "@/types/menuItem";

type CategoryOption = { id: string; title: string };

type FormState = {
  name: string;
  description: string;
  category_id: string;
  kind: MenuItemKind;
  price: string;
  price_media: string;
  price_grande: string;
  options: string;
  unavailable_options: string[];
};

function toFormState(item: MenuItemRecord | null): FormState {
  if (!item) {
    return {
      name: "",
      description: "",
      category_id: "",
      kind: "pizza",
      price: "",
      price_media: "",
      price_grande: "",
      options: "",
      unavailable_options: [],
    };
  }

  return {
    name: item.name,
    description: item.description ?? "",
    category_id: item.category_id,
    kind: item.kind,
    price: item.price?.toString() ?? "",
    price_media: item.price_media?.toString() ?? "",
    price_grande: item.price_grande?.toString() ?? "",
    options: item.options?.join(", ") ?? "",
    unavailable_options: item.unavailable_options ?? [],
  };
}

export default function MenuItemModal({
  item,
  categories = [],
  onClose,
}: {
  item: MenuItemRecord | null;
  categories?: CategoryOption[];
  onClose: () => void;
}) {
  const [form, setForm] = useState<FormState>(() => {
    const state = toFormState(item);
    if (!state.category_id && categories.length > 0) state.category_id = categories[0].id;
    return state;
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isEditing = item !== null;

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);

    const options = form.options
      .split(",")
      .map((opt) => opt.trim())
      .filter(Boolean);

    const payload = {
      name: form.name.trim(),
      description: form.description.trim() || null,
      category_id: form.category_id,
      kind: form.kind,
      price: form.kind === "simple" ? Number(form.price) || 0 : null,
      price_media: form.kind === "pizza" ? Number(form.price_media) || 0 : null,
      price_grande: form.kind === "pizza" ? Number(form.price_grande) || 0 : null,
      options: form.kind === "simple" && options.length > 0 ? options : [],
      unavailable_options: form.kind === "simple" ? form.unavailable_options : [],
    };

    let saveError: { message?: string; error?: string } | null = null;
    if (isEditing) {
      const res = await fetch("/api/admin/menu-items", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: item.id, ...payload }),
      });
      if (!res.ok) saveError = await res.json().catch(() => ({ error: `HTTP ${res.status}` }));
    } else {
      const res = await fetch("/api/admin/menu-items", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) saveError = await res.json().catch(() => ({ error: `HTTP ${res.status}` }));
    }

    setSaving(false);

    if (saveError) {
      setError(saveError.error ?? saveError.message ?? "Não foi possível salvar o item.");
      return;
    }

    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 backdrop-blur-sm sm:items-center"
      onClick={onClose}
    >
      <form
        onSubmit={handleSubmit}
        onClick={(e) => e.stopPropagation()}
        className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-t-2xl border border-border bg-background-elevated p-6 shadow-2xl sm:rounded-2xl"
      >
        <div className="mb-4 flex items-start justify-between gap-4">
          <h2 className="text-xl font-semibold text-foreground">
            {isEditing ? "Editar item" : "Adicionar item"}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="shrink-0 rounded-full border border-border p-2 text-muted transition hover:border-gold hover:text-gold"
            aria-label="Fechar"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              className="h-4 w-4"
            >
              <path strokeLinecap="round" d="M6 6l12 12M18 6 6 18" />
            </svg>
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="mb-1 block text-xs font-semibold uppercase tracking-widest text-gold">
              Nome
            </label>
            <input
              type="text"
              required
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              className="w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm text-foreground outline-none transition focus:border-gold"
            />
          </div>

          <div>
            <label className="mb-1 block text-xs font-semibold uppercase tracking-widest text-gold">
              Descrição
            </label>
            <textarea
              value={form.description}
              onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
              rows={3}
              className="w-full resize-none rounded-lg border border-border bg-background px-3 py-2.5 text-sm text-foreground outline-none transition focus:border-gold"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="mb-1 block text-xs font-semibold uppercase tracking-widest text-gold">
                Categoria
              </label>
              <select
                value={form.category_id}
                onChange={(e) => setForm((f) => ({ ...f, category_id: e.target.value }))}
                className="w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm text-foreground outline-none transition focus:border-gold"
              >
                {categories.map((cat) => (
                  <option key={cat.id} value={cat.id}>
                    {cat.title}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-1 block text-xs font-semibold uppercase tracking-widest text-gold">
                Tipo
              </label>
              <select
                value={form.kind}
                onChange={(e) =>
                  setForm((f) => ({ ...f, kind: e.target.value as MenuItemKind }))
                }
                className="w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm text-foreground outline-none transition focus:border-gold"
              >
                <option value="pizza">Pizza (média/grande)</option>
                <option value="simple">Item simples</option>
              </select>
            </div>
          </div>

          {form.kind === "pizza" ? (
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="mb-1 block text-xs font-semibold uppercase tracking-widest text-gold">
                  Preço médio
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  required
                  value={form.price_media}
                  onChange={(e) => setForm((f) => ({ ...f, price_media: e.target.value }))}
                  className="w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm text-foreground outline-none transition focus:border-gold"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold uppercase tracking-widest text-gold">
                  Preço grande
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  required
                  value={form.price_grande}
                  onChange={(e) => setForm((f) => ({ ...f, price_grande: e.target.value }))}
                  className="w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm text-foreground outline-none transition focus:border-gold"
                />
              </div>
            </div>
          ) : (
            <>
              <div>
                <label className="mb-1 block text-xs font-semibold uppercase tracking-widest text-gold">
                  Preço
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  required
                  value={form.price}
                  onChange={(e) => setForm((f) => ({ ...f, price: e.target.value }))}
                  className="w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm text-foreground outline-none transition focus:border-gold"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold uppercase tracking-widest text-gold">
                  Opções (separadas por vírgula)
                </label>
                <input
                  type="text"
                  value={form.options}
                  onChange={(e) => setForm((f) => ({ ...f, options: e.target.value }))}
                  placeholder="Ex: Coca-Cola, Coca Zero, Guaraná"
                  className="w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm text-foreground outline-none transition focus:border-gold"
                />
              </div>

              {/* Disponibilidade por sabor */}
              {form.options.trim() && (
                <div>
                  <label className="mb-2 block text-xs font-semibold uppercase tracking-widest text-gold">
                    Disponibilidade dos sabores
                  </label>
                  <div className="space-y-1.5">
                    {form.options
                      .split(",")
                      .map((o) => o.trim())
                      .filter(Boolean)
                      .map((opt) => {
                        const isUnavailable = form.unavailable_options.includes(opt);
                        return (
                          <label
                            key={opt}
                            className="flex cursor-pointer items-center justify-between rounded-lg border border-border bg-background px-3 py-2 text-sm"
                          >
                            <span className={isUnavailable ? "text-muted line-through" : "text-foreground"}>
                              {opt}
                            </span>
                            <div className="flex items-center gap-2">
                              {isUnavailable && (
                                <span className="text-xs font-medium text-red-400">Indisponível</span>
                              )}
                              <button
                                type="button"
                                onClick={() =>
                                  setForm((f) => ({
                                    ...f,
                                    unavailable_options: isUnavailable
                                      ? f.unavailable_options.filter((x) => x !== opt)
                                      : [...f.unavailable_options, opt],
                                  }))
                                }
                                className={`rounded-full px-3 py-0.5 text-xs font-semibold transition ${
                                  isUnavailable
                                    ? "bg-green-100 text-green-700 hover:bg-green-200"
                                    : "bg-red-100 text-red-600 hover:bg-red-200"
                                }`}
                              >
                                {isUnavailable ? "Reativar" : "Pausar"}
                              </button>
                            </div>
                          </label>
                        );
                      })}
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {error && <p className="mt-4 text-sm text-red-500">{error}</p>}

        <button
          type="submit"
          disabled={saving}
          className="mt-6 w-full rounded-xl bg-gold px-5 py-3 font-semibold text-white transition hover:bg-gold-soft disabled:cursor-not-allowed disabled:opacity-60"
        >
          {saving ? "Salvando..." : "Salvar"}
        </button>
      </form>
    </div>
  );
}
