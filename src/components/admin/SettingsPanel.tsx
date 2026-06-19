"use client";

import { useEffect, useState } from "react";

type BusinessHour = {
  id: string;
  day_of_week: number;
  open_time: string;
  close_time: string;
  active: boolean;
};

const DAY_NAMES = ["Domingo", "Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado"];

export default function SettingsPanel() {
  const [hours, setHours] = useState<BusinessHour[]>([]);
  const [drafts, setDrafts] = useState<Record<string, Partial<BusinessHour>>>({});
  const [manuallyClosed, setManuallyClosed] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savingToggle, setSavingToggle] = useState(false);
  const [saved, setSaved] = useState(false);

  const fetchAll = async () => {
    setLoading(true);
    const [hoursRes, settingsRes] = await Promise.all([
      fetch("/api/admin/business-hours").then((r) => r.json()),
      fetch("/api/admin/store-settings").then((r) => r.json()),
    ]);
    setHours(hoursRes.hours ?? []);
    setManuallyClosed(settingsRes.settings?.manually_closed === "true");
    setDrafts({});
    setLoading(false);
  };

  useEffect(() => { fetchAll(); }, []);

  const getDraft = (h: BusinessHour) =>
    ({ ...h, ...drafts[h.id] }) as BusinessHour;

  const updateDraft = (id: string, field: keyof BusinessHour, value: string | boolean) => {
    setDrafts((prev) => ({ ...prev, [id]: { ...prev[id], [field]: value } }));
  };

  const hasDirty = Object.keys(drafts).length > 0;

  const saveHours = async () => {
    setSaving(true);
    await Promise.all(
      Object.entries(drafts).map(([id, patch]) =>
        fetch(`/api/admin/business-hours/${id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(patch),
        })
      )
    );
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
    fetchAll();
  };

  const toggleManuallyClosed = async () => {
    setSavingToggle(true);
    const next = !manuallyClosed;
    await fetch("/api/admin/store-settings", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ manually_closed: String(next) }),
    });
    setManuallyClosed(next);
    setSavingToggle(false);
  };

  const inp = "rounded-lg border border-border bg-background px-3 py-1.5 text-sm text-foreground outline-none focus:border-gold";

  return (
    <div className="admin-theme space-y-8 max-w-2xl">
      {/* Toggle fechamento manual */}
      <div className="rounded-2xl border border-border bg-background-elevated p-5">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h3 className="font-semibold text-foreground">Fechar temporariamente</h3>
            <p className="mt-0.5 text-sm text-muted">
              Sobrepõe o horário automático. Use para imprevistos — o site exibirá "Estamos fechados".
            </p>
          </div>
          <button
            onClick={toggleManuallyClosed}
            disabled={savingToggle}
            className={`relative inline-flex h-7 w-12 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 focus:outline-none disabled:opacity-60 ${
              manuallyClosed ? "bg-red-500" : "bg-border"
            }`}
          >
            <span
              className={`inline-block h-6 w-6 transform rounded-full bg-white shadow transition duration-200 ${
                manuallyClosed ? "translate-x-5" : "translate-x-0"
              }`}
            />
          </button>
        </div>
        {manuallyClosed && (
          <p className="mt-3 rounded-lg bg-red-500/10 px-3 py-2 text-sm font-medium text-red-600">
            ⚠ Loja fechada manualmente — o site está bloqueando pedidos.
          </p>
        )}
      </div>

      {/* Horários por dia */}
      <div className="rounded-2xl border border-border bg-background-elevated p-5">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="font-semibold text-foreground">Horário de Funcionamento</h3>
          {hasDirty && (
            <button
              onClick={saveHours}
              disabled={saving}
              className="rounded-lg bg-gold px-4 py-1.5 text-sm font-semibold text-white disabled:opacity-60"
            >
              {saving ? "Salvando…" : saved ? "Salvo ✓" : "Salvar"}
            </button>
          )}
        </div>

        {loading ? (
          <p className="py-4 text-sm text-muted">Carregando…</p>
        ) : (
          <div className="space-y-3">
            {hours.map((h) => {
              const d = getDraft(h);
              const isDirty = !!drafts[h.id];
              return (
                <div
                  key={h.id}
                  className={`flex items-center gap-3 rounded-xl border px-4 py-3 transition ${
                    isDirty ? "border-gold/40 bg-gold/5" : "border-border"
                  }`}
                >
                  {/* Toggle ativo */}
                  <button
                    onClick={() => updateDraft(h.id, "active", !d.active)}
                    className={`relative inline-flex h-6 w-10 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors ${
                      d.active ? "bg-green-500" : "bg-border"
                    }`}
                  >
                    <span
                      className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition ${
                        d.active ? "translate-x-4" : "translate-x-0"
                      }`}
                    />
                  </button>

                  {/* Nome do dia */}
                  <span className={`w-20 text-sm font-medium ${d.active ? "text-foreground" : "text-muted line-through"}`}>
                    {DAY_NAMES[h.day_of_week]}
                  </span>

                  {d.active ? (
                    <div className="flex items-center gap-2">
                      <input
                        type="time"
                        value={d.open_time}
                        onChange={(e) => updateDraft(h.id, "open_time", e.target.value)}
                        className={inp}
                      />
                      <span className="text-sm text-muted">até</span>
                      <input
                        type="time"
                        value={d.close_time}
                        onChange={(e) => updateDraft(h.id, "close_time", e.target.value)}
                        className={inp}
                      />
                    </div>
                  ) : (
                    <span className="text-sm text-muted">Fechado</span>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
