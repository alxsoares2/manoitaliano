import { OrderRecord } from "@/types/database";

const WEEKDAY_LABELS = [
  "Domingo",
  "Segunda",
  "Terça",
  "Quarta",
  "Quinta",
  "Sexta",
  "Sábado",
];

export function startOfDay(date: Date): Date {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

export function addDays(date: Date, days: number): Date {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

function startOfWeek(date: Date): Date {
  const d = startOfDay(date);
  const day = d.getDay();
  const diff = (day === 0 ? -6 : 1) - day;
  return addDays(d, diff);
}

export function startOfMonth(date: Date): Date {
  const d = startOfDay(date);
  d.setDate(1);
  return d;
}

function daysBetween(a: Date, b: Date): number {
  return Math.floor((startOfDay(b).getTime() - startOfDay(a).getTime()) / 86400000);
}

function isWithin(date: Date, start: Date, end: Date): boolean {
  return date >= start && date < end;
}

function filterByRange(orders: OrderRecord[], start: Date, end: Date): OrderRecord[] {
  return orders.filter((o) => isWithin(new Date(o.created_at), start, end));
}

export const filterOrdersByDateRange = filterByRange;

export function sumRevenue(orders: OrderRecord[]): number {
  return orders.reduce((sum, o) => sum + o.total, 0);
}

export function pctChange(current: number, previous: number): number | null {
  if (previous === 0) return current === 0 ? 0 : null;
  return ((current - previous) / previous) * 100;
}

export type DayMetrics = {
  revenue: number;
  count: number;
  avgTicket: number;
};

function computeMetrics(orders: OrderRecord[]): DayMetrics {
  const revenue = sumRevenue(orders);
  const count = orders.length;
  return { revenue, count, avgTicket: count > 0 ? revenue / count : 0 };
}

export type TodaySummary = {
  today: DayMetrics;
  yesterday: DayMetrics;
  revenueChangePct: number | null;
  ordersChangePct: number | null;
};

export function getTodaySummary(orders: OrderRecord[]): TodaySummary {
  const now = new Date();
  const todayStart = startOfDay(now);
  const yesterdayStart = addDays(todayStart, -1);

  const today = computeMetrics(filterByRange(orders, todayStart, addDays(todayStart, 1)));
  const yesterday = computeMetrics(filterByRange(orders, yesterdayStart, todayStart));

  return {
    today,
    yesterday,
    revenueChangePct: pctChange(today.revenue, yesterday.revenue),
    ordersChangePct: pctChange(today.count, yesterday.count),
  };
}

export type PeriodComparison = {
  current: number;
  previous: number;
  changePct: number | null;
};

export function getWeekComparison(orders: OrderRecord[]): PeriodComparison {
  const now = new Date();
  const currentWeekStart = startOfWeek(now);
  const previousWeekStart = addDays(currentWeekStart, -7);
  const elapsedDays = daysBetween(currentWeekStart, now) + 1;
  const previousWeekEnd = addDays(previousWeekStart, elapsedDays);

  const current = sumRevenue(filterByRange(orders, currentWeekStart, addDays(now, 1)));
  const previous = sumRevenue(filterByRange(orders, previousWeekStart, previousWeekEnd));

  return { current, previous, changePct: pctChange(current, previous) };
}

export function getMonthComparison(orders: OrderRecord[]): PeriodComparison {
  const now = new Date();
  const currentMonthStart = startOfMonth(now);
  const previousMonthStart = startOfMonth(addDays(currentMonthStart, -1));
  const elapsedDays = now.getDate();
  const previousMonthEnd = addDays(previousMonthStart, elapsedDays);

  const current = sumRevenue(filterByRange(orders, currentMonthStart, addDays(now, 1)));
  const previous = sumRevenue(filterByRange(orders, previousMonthStart, previousMonthEnd));

  return { current, previous, changePct: pctChange(current, previous) };
}

export type BestWeekday = { label: string; count: number };

export function getBestWeekday(orders: OrderRecord[]): BestWeekday | null {
  if (orders.length === 0) return null;
  const counts = new Array(7).fill(0);
  orders.forEach((o) => counts[new Date(o.created_at).getDay()]++);
  const max = Math.max(...counts);
  if (max === 0) return null;
  const idx = counts.indexOf(max);
  return { label: WEEKDAY_LABELS[idx], count: max };
}

export type PeakHour = { label: string; count: number };

export function getPeakHourRange(orders: OrderRecord[]): PeakHour | null {
  if (orders.length === 0) return null;
  const buckets = new Array(12).fill(0);
  orders.forEach((o) => {
    const hour = new Date(o.created_at).getHours();
    buckets[Math.floor(hour / 2)]++;
  });
  const max = Math.max(...buckets);
  if (max === 0) return null;
  const idx = buckets.indexOf(max);
  const startHour = idx * 2;
  const endHour = startHour + 2;
  const pad = (n: number) => n.toString().padStart(2, "0");
  return { label: `${pad(startHour)}h às ${pad(endHour)}h`, count: max };
}

export type DailyPoint = { date: string; revenue: number };

export function getLast30DaysRevenue(orders: OrderRecord[]): DailyPoint[] {
  const today = startOfDay(new Date());
  const points: DailyPoint[] = [];

  for (let i = 29; i >= 0; i--) {
    const day = addDays(today, -i);
    const next = addDays(day, 1);
    const revenue = sumRevenue(filterByRange(orders, day, next));
    points.push({
      date: day.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" }),
      revenue,
    });
  }

  return points;
}

export type WeekdayPoint = { day: string; avg: number };

const MONDAY_FIRST_ORDER = [1, 2, 3, 4, 5, 6, 0];

export function getOrdersByWeekdayAvg(orders: OrderRecord[]): WeekdayPoint[] {
  if (orders.length === 0) {
    return MONDAY_FIRST_ORDER.map((idx) => ({ day: WEEKDAY_LABELS[idx].slice(0, 3), avg: 0 }));
  }

  const counts = new Array(7).fill(0);
  const occurrences = new Array(7).fill(0);

  const dates = orders.map((o) => startOfDay(new Date(o.created_at)).getTime());
  const minDate = new Date(Math.min(...dates));
  const maxDate = new Date(Math.max(...dates));

  for (let d = new Date(minDate); d <= maxDate; d = addDays(d, 1)) {
    occurrences[d.getDay()]++;
  }
  orders.forEach((o) => counts[new Date(o.created_at).getDay()]++);

  return MONDAY_FIRST_ORDER.map((idx) => ({
    day: WEEKDAY_LABELS[idx].slice(0, 3),
    avg: occurrences[idx] > 0 ? counts[idx] / occurrences[idx] : 0,
  }));
}

export type TopItem = { name: string; qty: number };

export function getTopItems(orders: OrderRecord[], limit = 5): TopItem[] {
  const counts = new Map<string, number>();
  orders.forEach((o) => {
    o.items.forEach((item) => {
      counts.set(item.name, (counts.get(item.name) ?? 0) + item.qty);
    });
  });

  return Array.from(counts.entries())
    .map(([name, qty]) => ({ name, qty }))
    .sort((a, b) => b.qty - a.qty)
    .slice(0, limit);
}

export type Period = "today" | "7days" | "30days" | "month";

export type PeriodSummary = DayMetrics & { topItem: string };

export function getPeriodSummary(orders: OrderRecord[], period: Period): PeriodSummary {
  const now = new Date();
  const today = startOfDay(now);
  const end = addDays(today, 1);

  let start: Date;
  switch (period) {
    case "today":
      start = today;
      break;
    case "7days":
      start = addDays(today, -6);
      break;
    case "30days":
      start = addDays(today, -29);
      break;
    case "month":
      start = startOfMonth(now);
      break;
  }

  const filtered = filterByRange(orders, start, end);
  const metrics = computeMetrics(filtered);
  const top = getTopItems(filtered, 1);

  return { ...metrics, topItem: top.length > 0 ? top[0].name : "—" };
}

export type ReportPreset =
  | "today"
  | "yesterday"
  | "7days"
  | "30days"
  | "month"
  | "lastMonth";

export type DateRange = { start: Date; end: Date };

export function getPresetRange(preset: ReportPreset): DateRange {
  const now = new Date();
  const today = startOfDay(now);

  switch (preset) {
    case "today":
      return { start: today, end: addDays(today, 1) };
    case "yesterday":
      return { start: addDays(today, -1), end: today };
    case "7days":
      return { start: addDays(today, -6), end: addDays(today, 1) };
    case "30days":
      return { start: addDays(today, -29), end: addDays(today, 1) };
    case "month":
      return { start: startOfMonth(now), end: addDays(today, 1) };
    case "lastMonth": {
      const thisMonthStart = startOfMonth(now);
      return { start: startOfMonth(addDays(thisMonthStart, -1)), end: thisMonthStart };
    }
  }
}

export type ReportSummary = DayMetrics & { biggestOrder: number };

export function getReportSummary(orders: OrderRecord[]): ReportSummary {
  const metrics = computeMetrics(orders);
  const biggestOrder = orders.reduce((max, o) => Math.max(max, o.total), 0);
  return { ...metrics, biggestOrder };
}

export type TopItemWithRevenue = TopItem & { revenue: number };

export function getTopItemsWithRevenue(
  orders: OrderRecord[],
  limit = 10
): TopItemWithRevenue[] {
  const stats = new Map<string, { qty: number; revenue: number }>();

  orders.forEach((o) => {
    o.items.forEach((item) => {
      const entry = stats.get(item.name) ?? { qty: 0, revenue: 0 };
      entry.qty += item.qty;
      entry.revenue += (item.unitPrice + (item.bordaPrice ?? 0)) * item.qty;
      stats.set(item.name, entry);
    });
  });

  return Array.from(stats.entries())
    .map(([name, { qty, revenue }]) => ({ name, qty, revenue }))
    .sort((a, b) => b.qty - a.qty)
    .slice(0, limit);
}
