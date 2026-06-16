"use client";

import { ReportPreset } from "@/lib/analytics";

const PRESETS: { value: ReportPreset; label: string }[] = [
  { value: "today", label: "Hoje" },
  { value: "yesterday", label: "Ontem" },
  { value: "7days", label: "Últimos 7 dias" },
  { value: "30days", label: "Últimos 30 dias" },
  { value: "month", label: "Mês atual" },
  { value: "lastMonth", label: "Mês anterior" },
];

export default function PeriodSelector({
  preset,
  onSelectPreset,
  customStart,
  customEnd,
  onChangeCustomStart,
  onChangeCustomEnd,
}: {
  preset: ReportPreset | "custom";
  onSelectPreset: (preset: ReportPreset) => void;
  customStart: string;
  customEnd: string;
  onChangeCustomStart: (value: string) => void;
  onChangeCustomEnd: (value: string) => void;
}) {
  return (
    <div className="rounded-xl border border-border bg-background-elevated p-5 shadow-sm">
      <div className="flex flex-wrap gap-2">
        {PRESETS.map((option) => (
          <button
            key={option.value}
            onClick={() => onSelectPreset(option.value)}
            className={`rounded-full px-4 py-1.5 text-xs font-semibold transition ${
              preset === option.value
                ? "bg-gold text-white"
                : "border border-border text-muted hover:border-gold hover:text-gold"
            }`}
          >
            {option.label}
          </button>
        ))}
      </div>

      <div className="mt-4 flex flex-wrap items-end gap-3">
        <div>
          <label className="mb-1 block text-xs font-semibold uppercase tracking-widest text-muted">
            De
          </label>
          <input
            type="date"
            value={customStart}
            onChange={(e) => onChangeCustomStart(e.target.value)}
            className="rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground outline-none transition focus:border-gold"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-semibold uppercase tracking-widest text-muted">
            Até
          </label>
          <input
            type="date"
            value={customEnd}
            onChange={(e) => onChangeCustomEnd(e.target.value)}
            className="rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground outline-none transition focus:border-gold"
          />
        </div>
        {preset === "custom" && (
          <span className="rounded-full bg-gold px-4 py-1.5 text-xs font-semibold text-white">
            Período personalizado
          </span>
        )}
      </div>
    </div>
  );
}
