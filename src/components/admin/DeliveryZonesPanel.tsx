"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";

type Zone = {
  id: string;
  neighborhood: string;
  delivery_fee: number;
  estimated_time: string;
  active: boolean;
};

type Draft = {
  delivery_fee: string;
  estimated_time: string;
  active: boolean;
};

function roundTo99(value: number): number {
  return Math.floor(value) + 0.99;
}

function AddModal({ onClose, onSaved }: { onClose: () => void; onSaved: () => void }) {
  const [form, setForm] = useState({ neighborhood: "", delivery_fee: "", estimated_time: "40-55 min" });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const fee = parseFloat(form.delivery_fee);
    if (!form.neighborhood.trim()) return setError("Informe o bairro");
    if (isNaN(fee) || fee <= 0) return setError("Informe um valor de frete válido");
    setSaving(true);
    setError(null);
    const res = await fetch("/api/admin/delivery-zones", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        neighborhood: form.neighborhood,
        delivery_fee: roundTo99(fee),
        estimated_time: form.estimated_time || "40-55 min",
      }),
    });
    setSaving(false);
    if (!res.ok) { const j = await res.json(); return setError(j.error ?? "Erro ao salvar"); }
    onSaved();
    onClose();
  };

  const labelClass = "mb-1 block text-xs font-semibold uppercase tracking-wider text-[var(--admin-muted)]";
  const inputClass = "w-full rounded-lg border border-[var(--admin-border)] bg-[var(--admin-surface)] px-3 py-2 text-sm text-[var(--admin-fg)] outline-none focus:border-[var(--admin-gold)]";

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="w-full max-w-md rounded-2xl bg-[var(--admin-bg)] p-6 shadow-2xl">
        <h2 className="mb-5 text-lg font-bold text-[var(--admin-fg)]">Adicionar Bairro</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className={labelClass}>Bairro</label>
            <input className={inputClass} value={form.neighborhood} onChange={(e) => setForm((f) => ({ ...f, neighborhood: e.target.value }))} placeholder="Nome do bairro" />
          </div>
          <div>
            <label className={labelClass}>Frete (R$) — será arredondado para ,99</label>
            <input className={inputClass} type="number" step="0.01" min="0" value={form.delivery_fee} onChange={(e) => setForm((f) => ({ ...f, delivery_fee: e.target.value }))} placeholder="Ex.: 12.00" />
            {form.delivery_fee && !isNaN(parseFloat(form.delivery_fee)) && (
              <p className="mt-1 text-xs text-[var(--admin-muted)]">
                Será salvo como R${roundTo99(parseFloat(form.delivery_fee)).toFixed(2).replace(".", ",")}
              </p>
            )}
          </div>
          <div>
            <label className={labelClass}>Tempo estimado</label>
            <input className={inputClass} value={form.estimated_time} onChange={(e) => setForm((f) => ({ ...f, estimated_time: e.target.value }))} placeholder="Ex.: 40-55 min" />
          </div>
          {error && <p className="text-xs text-red-500">{error}</p>}
          <div className="flex gap-3 pt-1">
            <button type="button" onClick={onClose} className="flex-1 rounded-lg border border-[var(--admin-border)] py-2 text-sm text-[var(--admin-muted)] hover:border-[var(--admin-gold)] hover:text-[var(--admin-gold)]">Cancelar</button>
            <button type="submit" disabled={saving} className="flex-1 rounded-lg bg-[var(--admin-gold)] py-2 text-sm font-semibold text-white disabled:opacity-50">{saving ? "Salvando…" : "Adicionar"}</button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
}

export default function DeliveryZonesPanel() {
  const [zones, setZones] = useState<Zone[]>([]);
  const [loading, setLoading] = useState(true);
  const [drafts, setDrafts] = useState<Record<string, Draft>>({});
  const [saving, setSaving] = useState(false);
  const [showAdd, setShowAdd] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  const fetchZones = async () => {
    setLoading(true);
    const res = await fetch("/api/admin/delivery-zones");
    const json = await res.json();
    setZones(json.zones ?? []);
    setDrafts({});
    setLoading(false);
  };

  useEffect(() => { fetchZones(); }, []);

  const dirtyIds = Object.keys(drafts);
  const hasDirty = dirtyIds.length > 0;

  const getDraft = (zone: Zone): Draft =>
    drafts[zone.id] ?? { delivery_fee: String(zone.delivery_fee), estimated_time: zone.estimated_time, active: zone.active };

  const updateDraft = (id: string, field: keyof Draft, value: string | boolean) => {
    setDrafts((prev) => {
      const zone = zones.find((z) => z.id === id)!;
      const current = prev[id] ?? { delivery_fee: String(zone.delivery_fee), estimated_time: zone.estimated_time, active: zone.active };
      const updated = { ...current, [field]: value };
      // Se voltou ao valor original, remove do draft
      const isOriginal =
        String(updated.delivery_fee) === String(zone.delivery_fee) &&
        updated.estimated_time === zone.estimated_time &&
        updated.active === zone.active;
      if (isOriginal) {
        const { [id]: _, ...rest } = prev;
        return rest;
      }
      return { ...prev, [id]: updated };
    });
  };

  const saveAll = async () => {
    setSaving(true);
    await Promise.all(
      dirtyIds.map(async (id) => {
        const draft = drafts[id];
        const fee = parseFloat(draft.delivery_fee);
        await fetch(`/api/admin/delivery-zones/${id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            delivery_fee: isNaN(fee) ? undefined : roundTo99(fee),
            estimated_time: draft.estimated_time,
            active: draft.active,
          }),
        });
      })
    );
    setSaving(false);
    fetchZones();
  };

  const discardAll = () => setDrafts({});

  const handleDelete = async (id: string) => {
    await fetch(`/api/admin/delivery-zones/${id}`, { method: "DELETE" });
    setDeleteConfirm(null);
    fetchZones();
  };

  const cellInput = "w-full rounded-md border border-transparent bg-transparent px-2 py-1 text-sm text-[var(--admin-fg)] outline-none transition hover:border-[var(--admin-border)] focus:border-[var(--admin-gold)] focus:bg-[var(--admin-surface)]";
  const cellInputDirty = "w-full rounded-md border border-[var(--admin-gold)]/60 bg-[var(--admin-gold)]/5 px-2 py-1 text-sm text-[var(--admin-fg)] outline-none focus:border-[var(--admin-gold)]";

  return (
    <div className="admin-theme">
      {/* Barra superior */}
      <div className="mb-4 flex items-center justify-between gap-3">
        <p className="text-sm text-[var(--admin-muted)]">
          {zones.length} bairro{zones.length !== 1 ? "s" : ""} cadastrado{zones.length !== 1 ? "s" : ""}
          {hasDirty && (
            <span className="ml-2 rounded-full bg-[var(--admin-gold)]/20 px-2 py-0.5 text-xs font-semibold text-[var(--admin-gold)]">
              {dirtyIds.length} alteração{dirtyIds.length !== 1 ? "ões" : ""} pendente{dirtyIds.length !== 1 ? "s" : ""}
            </span>
          )}
        </p>
        <div className="flex items-center gap-2">
          {hasDirty && (
            <>
              <button onClick={discardAll} className="rounded-lg border border-[var(--admin-border)] px-4 py-2 text-sm text-[var(--admin-muted)] hover:border-[var(--admin-gold)] hover:text-[var(--admin-gold)]">
                Descartar
              </button>
              <button onClick={saveAll} disabled={saving} className="rounded-lg px-4 py-2 text-sm font-semibold text-white disabled:opacity-60 hover:opacity-90" style={{ background: "#C9A84C" }}>
                {saving ? "Salvando…" : `Salvar ${dirtyIds.length > 1 ? `${dirtyIds.length} alterações` : "alteração"}`}
              </button>
            </>
          )}
          <button onClick={() => setShowAdd(true)} className="rounded-lg border border-[var(--admin-border)] bg-[var(--admin-surface)] px-4 py-2 text-sm font-semibold text-[var(--admin-fg)] hover:border-[var(--admin-gold)] hover:text-[var(--admin-gold)]">
            + Adicionar Bairro
          </button>
        </div>
      </div>

      {/* Instrução */}
      {!hasDirty && !loading && zones.length > 0 && (
        <p className="mb-3 text-xs text-[var(--admin-muted)]">
          Clique em qualquer valor de frete, tempo ou status para editar. Edite quantos quiser e salve de uma vez.
        </p>
      )}

      {loading ? (
        <p className="py-8 text-center text-sm text-[var(--admin-muted)]">Carregando…</p>
      ) : zones.length === 0 ? (
        <p className="py-8 text-center text-sm text-[var(--admin-muted)]">Nenhuma zona cadastrada.</p>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-[var(--admin-border)]">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[var(--admin-border)] bg-[var(--admin-surface)]">
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-[var(--admin-muted)]">Bairro</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-[var(--admin-muted)]">Frete (R$)</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-[var(--admin-muted)]">Tempo</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-[var(--admin-muted)]">Ativo</th>
                <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-[var(--admin-muted)]">Excluir</th>
              </tr>
            </thead>
            <tbody>
              {zones.map((zone) => {
                const draft = getDraft(zone);
                const isDirty = !!drafts[zone.id];

                return (
                  <tr key={zone.id} className={`border-b border-[var(--admin-border)] last:border-0 transition ${isDirty ? "bg-[var(--admin-gold)]/5" : "hover:bg-[var(--admin-surface)]"}`}>
                    {/* Bairro — não editável inline, usa modal para adicionar */}
                    <td className="px-4 py-2.5 font-medium text-[var(--admin-fg)]">
                      {zone.neighborhood}
                      {isDirty && <span className="ml-1.5 inline-block h-1.5 w-1.5 rounded-full bg-[var(--admin-gold)] align-middle" />}
                    </td>

                    {/* Frete */}
                    <td className="px-2 py-1.5">
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        value={draft.delivery_fee}
                        onChange={(e) => updateDraft(zone.id, "delivery_fee", e.target.value)}
                        className={isDirty && draft.delivery_fee !== String(zone.delivery_fee) ? cellInputDirty : cellInput}
                        title="Clique para editar o frete"
                      />
                    </td>

                    {/* Tempo */}
                    <td className="px-2 py-1.5">
                      <input
                        type="text"
                        value={draft.estimated_time}
                        onChange={(e) => updateDraft(zone.id, "estimated_time", e.target.value)}
                        className={isDirty && draft.estimated_time !== zone.estimated_time ? cellInputDirty : cellInput}
                        title="Clique para editar o tempo estimado"
                      />
                    </td>

                    {/* Toggle ativo */}
                    <td className="px-4 py-2.5">
                      <button
                        onClick={() => updateDraft(zone.id, "active", !draft.active)}
                        className={`rounded-full px-3 py-1 text-xs font-semibold transition ${
                          draft.active
                            ? "bg-green-500/15 text-green-600 hover:bg-red-500/10 hover:text-red-500"
                            : "bg-red-500/15 text-red-600 hover:bg-green-500/10 hover:text-green-600"
                        }`}
                      >
                        {draft.active ? "Ativo" : "Inativo"}
                      </button>
                    </td>

                    {/* Excluir */}
                    <td className="px-4 py-2.5 text-right">
                      <button
                        onClick={() => setDeleteConfirm(zone.id)}
                        title="Excluir"
                        className="rounded-lg p-1.5 text-[var(--admin-muted)] hover:bg-red-500/10 hover:text-red-500"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-4 w-4">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Barra de salvar flutuante quando há alterações */}
      {hasDirty && createPortal(
        <div className="fixed bottom-6 left-1/2 z-40 -translate-x-1/2">
          <div className="flex items-center gap-3 rounded-2xl px-5 py-3 shadow-2xl" style={{ background: "#1a1a1a", border: "1px solid #333" }}>
            <span className="text-sm text-white/90">
              <span className="font-semibold" style={{ color: "#C9A84C" }}>{dirtyIds.length}</span> bairro{dirtyIds.length !== 1 ? "s" : ""} com alterações
            </span>
            <button onClick={discardAll} className="rounded-lg px-3 py-1.5 text-sm text-white/60 hover:text-white">
              Descartar
            </button>
            <button onClick={saveAll} disabled={saving} className="rounded-lg px-4 py-1.5 text-sm font-semibold text-white disabled:opacity-60" style={{ background: "#C9A84C" }}>
              {saving ? "Salvando…" : "Salvar tudo"}
            </button>
          </div>
        </div>,
        document.body
      )}

      {showAdd && <AddModal onClose={() => setShowAdd(false)} onSaved={fetchZones} />}

      {deleteConfirm && createPortal(
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="w-full max-w-sm rounded-2xl bg-[var(--admin-bg)] p-6 shadow-2xl">
            <h2 className="mb-2 text-lg font-bold text-[var(--admin-fg)]">Confirmar exclusão</h2>
            <p className="mb-5 text-sm text-[var(--admin-muted)]">Esta zona será removida permanentemente. Deseja continuar?</p>
            <div className="flex gap-3">
              <button onClick={() => setDeleteConfirm(null)} className="flex-1 rounded-lg border border-[var(--admin-border)] py-2 text-sm text-[var(--admin-muted)] hover:border-[var(--admin-gold)]">Cancelar</button>
              <button onClick={() => handleDelete(deleteConfirm)} className="flex-1 rounded-lg bg-red-500 py-2 text-sm font-semibold text-white hover:bg-red-600">Excluir</button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
