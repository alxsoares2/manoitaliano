"use client";

import { MenuItemRecord } from "@/types/menuItem";
import { formatPrice } from "@/lib/format";

export default function MenuItemAdminCard({
  item,
  onToggleActive,
  onEdit,
}: {
  item: MenuItemRecord;
  onToggleActive: (item: MenuItemRecord) => void;
  onEdit: (item: MenuItemRecord) => void;
}) {
  const priceLabel =
    item.kind === "pizza"
      ? `${formatPrice(item.price_media ?? 0)} / ${formatPrice(item.price_grande ?? 0)}`
      : formatPrice(item.price ?? 0);

  return (
    <div
      className={`flex gap-4 rounded-xl border border-border bg-background-elevated p-4 shadow-sm transition ${
        item.is_active ? "" : "opacity-50"
      }`}
    >
      <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-lg bg-background text-2xl">
        🍕
      </div>

      <div className="flex flex-1 flex-col">
        <div className="flex items-start justify-between gap-2">
          <h3 className="font-semibold text-foreground">{item.name}</h3>
          <span className="shrink-0 text-sm font-medium text-gold">{priceLabel}</span>
        </div>
        {item.description && (
          <p className="mt-1 line-clamp-2 text-sm text-muted">{item.description}</p>
        )}

        <div className="mt-3 flex items-center justify-between">
          <label className="flex cursor-pointer items-center gap-2 text-sm text-muted">
            <input
              type="checkbox"
              checked={item.is_active}
              onChange={() => onToggleActive(item)}
              className="h-4 w-4 accent-[var(--gold)]"
            />
            {item.is_active ? "Ativo" : "Inativo"}
          </label>

          <button
            onClick={() => onEdit(item)}
            className="rounded-full border border-border bg-background px-4 py-1.5 text-xs font-semibold uppercase tracking-widest text-muted transition hover:border-gold hover:text-gold"
          >
            Editar
          </button>
        </div>
      </div>
    </div>
  );
}
