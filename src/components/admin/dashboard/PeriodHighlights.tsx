import { BestWeekday, PeakHour, PeriodComparison } from "@/lib/analytics";
import { formatPercent, formatPrice } from "@/lib/format";

export default function PeriodHighlights({
  week,
  month,
  bestWeekday,
  peakHour,
}: {
  week: PeriodComparison;
  month: PeriodComparison;
  bestWeekday: BestWeekday | null;
  peakHour: PeakHour | null;
}) {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <ComparisonCard
        label="Faturamento da semana"
        current={week.current}
        previous={week.previous}
        changePct={week.changePct}
        previousLabel="semana anterior"
      />
      <ComparisonCard
        label="Faturamento do mês"
        current={month.current}
        previous={month.previous}
        changePct={month.changePct}
        previousLabel="mês anterior"
      />
      <InfoCard
        label="Melhor dia da semana"
        value={bestWeekday ? bestWeekday.label : "—"}
        hint={bestWeekday ? `${bestWeekday.count} pedidos no histórico` : "Sem dados suficientes"}
      />
      <InfoCard
        label="Horário de pico"
        value={peakHour ? peakHour.label : "—"}
        hint={peakHour ? `${peakHour.count} pedidos nessa faixa` : "Sem dados suficientes"}
      />
    </div>
  );
}

function ComparisonCard({
  label,
  current,
  previous,
  changePct,
  previousLabel,
}: {
  label: string;
  current: number;
  previous: number;
  changePct: number | null;
  previousLabel: string;
}) {
  const isPositive = (changePct ?? 0) >= 0;

  return (
    <div className="rounded-xl border border-border bg-background-elevated p-5 shadow-sm">
      <p className="text-xs font-semibold uppercase tracking-widest text-muted">{label}</p>
      <p className="mt-2 text-2xl font-bold text-foreground">{formatPrice(current)}</p>
      <p className={`mt-1 text-xs font-semibold ${isPositive ? "text-green-600" : "text-red-600"}`}>
        {formatPercent(changePct)}
      </p>
      <p className="mt-1 text-xs text-muted">
        {previousLabel}: {formatPrice(previous)}
      </p>
    </div>
  );
}

function InfoCard({ label, value, hint }: { label: string; value: string; hint: string }) {
  return (
    <div className="rounded-xl border border-border bg-background-elevated p-5 shadow-sm">
      <p className="text-xs font-semibold uppercase tracking-widest text-muted">{label}</p>
      <p className="mt-2 text-2xl font-bold text-foreground">{value}</p>
      <p className="mt-1 text-xs text-muted">{hint}</p>
    </div>
  );
}
