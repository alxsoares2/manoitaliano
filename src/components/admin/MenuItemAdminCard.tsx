"use client";

import { useRef, useState } from "react";
import { MenuItemRecord } from "@/types/menuItem";
import { formatPrice } from "@/lib/format";

export default function MenuItemAdminCard({
  item,
  onToggleActive,
  onEdit,
  onDelete,
  onImageUploaded,
}: {
  item: MenuItemRecord;
  onToggleActive: (item: MenuItemRecord) => void;
  onEdit: (item: MenuItemRecord) => void;
  onDelete: (item: MenuItemRecord) => void;
  onImageUploaded?: (itemId: string, url: string) => void;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [imgUrl, setImgUrl] = useState<string | null>(item.image_url ?? null);

  const priceLabel =
    item.kind === "pizza"
      ? `${formatPrice(item.price_media ?? 0)} / ${formatPrice(item.price_grande ?? 0)}`
      : formatPrice(item.price ?? 0);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    const fd = new FormData();
    fd.append("file", file);
    fd.append("itemId", item.id);
    try {
      const res = await fetch("/api/admin/upload-menu-image", { method: "POST", body: fd });
      const data = await res.json();
      if (res.ok && data.imageUrl) {
        setImgUrl(data.imageUrl);
        onImageUploaded?.(item.id, data.imageUrl);
      }
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  return (
    <div className={`flex gap-4 rounded-xl border border-border bg-background-elevated p-4 shadow-sm transition ${item.is_active ? "" : "opacity-50"}`}>
      {/* Foto / placeholder */}
      <div className="relative shrink-0">
        <div
          className="flex h-16 w-16 cursor-pointer items-center justify-center overflow-hidden rounded-lg border border-border bg-background"
          onClick={() => fileRef.current?.click()}
          title="Clique para alterar foto"
        >
          {imgUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={imgUrl} alt={item.name} className="h-full w-full object-cover" />
          ) : (
            <span className="text-2xl">🍕</span>
          )}
          {uploading && (
            <div className="absolute inset-0 flex items-center justify-center rounded-lg bg-black/40">
              <svg className="h-5 w-5 animate-spin text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
              </svg>
            </div>
          )}
        </div>
        <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleFileChange} />
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

          <div className="flex items-center gap-2">
            <button
              onClick={() => fileRef.current?.click()}
              disabled={uploading}
              className="rounded-full border border-border bg-background px-3 py-1.5 text-xs font-semibold uppercase tracking-widest text-muted transition hover:border-gold hover:text-gold disabled:opacity-50"
            >
              {imgUrl ? "Trocar foto" : "Adicionar foto"}
            </button>
            <button
              onClick={() => onEdit(item)}
              className="rounded-full border border-border bg-background px-4 py-1.5 text-xs font-semibold uppercase tracking-widest text-muted transition hover:border-gold hover:text-gold"
            >
              Editar
            </button>
            <button
              onClick={() => onDelete(item)}
              className="rounded-full border border-border bg-background p-1.5 text-muted transition hover:border-red-400 hover:text-red-500"
              aria-label="Excluir item"
            >
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-4 w-4">
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6" />
              </svg>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
