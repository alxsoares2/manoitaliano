"use client";

import { useEffect, useState } from "react";

type Zone = {
  id: string;
  neighborhood: string;
  delivery_fee: number;
  estimated_time: string;
  active: boolean;
};

type ModalState = { mode: "create" } | { mode: "edit"; zone: Zone } | null;

function roundTo99(value: number): number {
  return Math.floor(value) + 0.99;
}

function ZoneModal({
  state,
  onClose,
  onSaved,
}: {
  state: ModalState;
  onClose: () => void;
  onSaved: () => void;
}) {
  const isEdit = state?.mode === "edit";
  const initial = isEdit
    ? { neighborhood: state.zone.neighborhood, delivery_fee: String(state.zone.delivery_fee), estimated_time: state.zone.estimated_time }
    : { neighborhood: "", delivery_fee: "", estimated_time: "40-55 min" };

  const [form, setForm] = useState(initial);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => { setForm(initial); setError(null); }, [state]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const fee = parseFloat(form.delivery_fee);
    if (!form.neighborhood.trim()) return setError("Informe o bairro");
    if (isNaN(fee) || fee <= 0) return setError("Informe um valor de frete válido");

    setSaving(true);
    setError(null);

    const url = isEdit
      ? `/api/admin/delivery-zones/${state.zone.id}`
      : "/api/admin/delivery-zones";
    const method = isEdit ? "PATCH" : "POST";

    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        neighborhood: form.neighborhood,
        delivery_fee: roundTo99(fee),
        estimated_time: form.estimated_time || "40-55 min",
      }),
    });

    setSaving(false);
    if (!res.ok) {
      const j = await res.json();
      return setError(j.error ?? "Erro ao salvar");
    }
    onSaved();
    onClose();
  };

  const labelClass = "mb-1 block text-xs font-semibold uppercase tracking-wider text-[var(--admin-muted)]";
  const inputClass = "w-full rounded-lg border border-[var(--admin-border)] bg-[var(--admin-surface)] px-3 py-2 text-sm text-[var(--admin-fg)] outline-none focus:border-[var(--admin-gold)]";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="w-full max-w-md rounded-2xl bg-[var(--admin-bg)] p-6 shadow-2xl">
        <h2 className="mb-5 text-lg font-bold text-[var(--admin-fg)]">
          {isEdit ? "Editar Zona de Entrega" : "Adicionar Bairro"}
        </h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className={labelClass}>Bairro</label>
            <input
              className={inputClass}
              value={form.neighborhood}
              onChange={(e) => setForm((f) => ({ ...f, neighborhood: e.target.value }))}
              placeholder="Nome do bairro"
            />
          </div>
          <div>
            <label className={labelClass}>Frete (R$) — será arredondado para ,99</label>
            <input
              className={inputClass}
              type="number"
              step="0.01"
              min="0"
              value={form.delivery_fee}
              onChange={(e) => setForm((f) => ({ ...f, delivery_fee: e.target.value }))}
              placeholder="Ex.: 12.00"
            />
            {form.delivery_fee && !isNaN(parseFloat(form.delivery_fee)) && (
              <p className="mt-1 text-xs text-[var(--admin-muted)]">
                Será salvo como R${roundTo99(parseFloat(form.delivery_fee)).toFixed(2).replace(".", ",")}
              </p>
            )}
          </div>
          <div>
            <label className={labelClass}>Tempo estimado</label>
            <input
              className={inputClass}
              value={form.estimated_time}
              onChange={(e) => setForm((f) => ({ ...f, estimated_time: e.target.value }))}
              placeholder="Ex.: 40-55 min"
            />
          </div>

          {error && <p className="text-xs text-red-500">{error}</p>}

          <div className="flex gap-3 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 rounded-lg border border-[var(--admin-border)] py-2 text-sm text-[var(--admin-muted)] hover:border-[var(--admin-gold)] hover:text-[var(--admin-gold)]"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={saving}
              className="flex-1 rounded-lg bg-[var(--admin-gold)] py-2 text-sm font-semibold text-white disabled:opacity-50"
            >
              {saving ? "Salvando…" : isEdit ? "Salvar" : "Adicionar"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function DeliveryZonesPanel() {
  const [zones, setZones] = useState<Zone[]>([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState<ModalState>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  const fetchZones = async () => {
    setLoading(true);
    const res = await fetch("/api/admin/delivery-zones");
    const json = await res.json();
    setZones(json.zones ?? []);
    setLoading(false);
  };

  useEffect(() => { fetchZones(); }, []);

  const toggleActive = async (zone: Zone) => {
    await fetch(`/api/admin/delivery-zones/${zone.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ active: !zone.active }),
    });
    fetchZones();
  };

  const handleDelete = async (id: string) => {
    await fetch(`/api/admin/delivery-zones/${id}`, { method: "DELETE" });
    setDeleteConfirm(null);
    fetchZones();
  };

  return (
    <div className="admin-theme">
      <div className="mb-4 flex items-center justify-between">
        <p className="text-sm text-[var(--admin-muted)]">
          {zones.length} bairro{zones.length !== 1 ? "s" : ""} cadastrado{zones.length !== 1 ? "s" : ""}
        </p>
        <button
          onClick={() => setModal({ mode: "create" })}
          className="rounded-lg bg-[var(--admin-gold)] px-4 py-2 text-sm font-semibold text-white hover:opacity-90"
        >
          + Adicionar Bairro
        </button>
      </div>

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
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-[var(--admin-muted)]">Frete</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-[var(--admin-muted)]">Tempo</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-[var(--admin-muted)]">Status</th>
                <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-[var(--admin-muted)]">Ações</th>
              </tr>
            </thead>
            <tbody>
              {zones.map((zone) => (
                <tr key={zone.id} className="border-b border-[var(--admin-border)] last:border-0 hover:bg-[var(--admin-surface)]">
                  <td className="px-4 py-3 font-medium text-[var(--admin-fg)]">{zone.neighborhood}</td>
                  <td className="px-4 py-3 text-[var(--admin-fg)]">
                    R${Number(zone.delivery_fee).toFixed(2).replace(".", ",")}
                  </td>
                  <td className="px-4 py-3 text-[var(--admin-muted)]">{zone.estimated_time}</td>
                  <td className="px-4 py-3">
                    <button
                      onClick={() => toggleActive(zone)}
                      className={`rounded-full px-3 py-1 text-xs font-semibold transition ${
                        zone.active
                          ? "bg-green-500/15 text-green-600 hover:bg-red-500/15 hover:text-red-600"
                          : "bg-red-500/15 text-red-600 hover:bg-green-500/15 hover:text-green-600"
                      }`}
                    >
                      {zone.active ? "Ativo" : "Inativo"}
                    </button>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => setModal({ mode: "edit", zone })}
                        title="Editar"
                        className="rounded-lg p-1.5 text-[var(--admin-muted)] hover:bg-[var(--admin-surface)] hover:text-[var(--admin-gold)]"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-4 w-4">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                        </svg>
                      </button>
                      <button
                        onClick={() => setDeleteConfirm(zone.id)}
                        title="Excluir"
                        className="rounded-lg p-1.5 text-[var(--admin-muted)] hover:bg-red-500/10 hover:text-red-500"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-4 w-4">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {modal && (
        <ZoneModal state={modal} onClose={() => setModal(null)} onSaved={fetchZones} />
      )}

      {deleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="w-full max-w-sm rounded-2xl bg-[var(--admin-bg)] p-6 shadow-2xl">
            <h2 className="mb-2 text-lg font-bold text-[var(--admin-fg)]">Confirmar exclusão</h2>
            <p className="mb-5 text-sm text-[var(--admin-muted)]">
              Esta zona será removida permanentemente. Deseja continuar?
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setDeleteConfirm(null)}
                className="flex-1 rounded-lg border border-[var(--admin-border)] py-2 text-sm text-[var(--admin-muted)] hover:border-[var(--admin-gold)]"
              >
                Cancelar
              </button>
              <button
                onClick={() => handleDelete(deleteConfirm)}
                className="flex-1 rounded-lg bg-red-500 py-2 text-sm font-semibold text-white hover:bg-red-600"
              >
                Excluir
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
