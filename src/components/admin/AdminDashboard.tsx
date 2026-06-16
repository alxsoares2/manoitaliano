"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";
import { OrderRecord } from "@/types/database";
import {
  getBestWeekday,
  getLast30DaysRevenue,
  getMonthComparison,
  getOrdersByWeekdayAvg,
  getPeakHourRange,
  getTodaySummary,
  getTopItems,
  getWeekComparison,
} from "@/lib/analytics";
import StatsOverview from "./dashboard/StatsOverview";
import PeriodHighlights from "./dashboard/PeriodHighlights";
import RevenueLineChart from "./dashboard/RevenueLineChart";
import WeekdayBarChart from "./dashboard/WeekdayBarChart";
import TopItemsChart from "./dashboard/TopItemsChart";
import PeriodSummaryTable from "./dashboard/PeriodSummaryTable";

export default function AdminDashboard() {
  const [orders, setOrders] = useState<OrderRecord[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;

    const fetchOrders = () =>
      supabase
        .from("orders")
        .select("*")
        .order("created_at", { ascending: false })
        .then(({ data }) => {
          if (active && data) setOrders(data as OrderRecord[]);
          if (active) setLoading(false);
        });

    fetchOrders();

    const channel = supabase
      .channel("dashboard-orders-changes")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "orders" },
        () => fetchOrders()
      )
      .subscribe();

    return () => {
      active = false;
      supabase.removeChannel(channel);
    };
  }, []);

  const todaySummary = useMemo(() => getTodaySummary(orders), [orders]);
  const weekComparison = useMemo(() => getWeekComparison(orders), [orders]);
  const monthComparison = useMemo(() => getMonthComparison(orders), [orders]);
  const bestWeekday = useMemo(() => getBestWeekday(orders), [orders]);
  const peakHour = useMemo(() => getPeakHourRange(orders), [orders]);
  const revenueByDay = useMemo(() => getLast30DaysRevenue(orders), [orders]);
  const ordersByWeekday = useMemo(() => getOrdersByWeekdayAvg(orders), [orders]);
  const topItems = useMemo(() => getTopItems(orders, 5), [orders]);

  if (loading) {
    return <p className="text-center text-sm text-muted">Carregando dados...</p>;
  }

  if (orders.length === 0) {
    return <p className="text-center text-sm text-muted">Nenhum pedido registrado ainda.</p>;
  }

  return (
    <div className="space-y-6">
      <section>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-widest text-muted">
          Resumo do dia
        </h2>
        <StatsOverview summary={todaySummary} />
      </section>

      <section>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-widest text-muted">
          Semana e mês
        </h2>
        <PeriodHighlights
          week={weekComparison}
          month={monthComparison}
          bestWeekday={bestWeekday}
          peakHour={peakHour}
        />
      </section>

      <section className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <RevenueLineChart data={revenueByDay} />
        <WeekdayBarChart data={ordersByWeekday} />
        <div className="lg:col-span-2">
          <TopItemsChart data={topItems} />
        </div>
      </section>

      <section>
        <PeriodSummaryTable orders={orders} />
      </section>
    </div>
  );
}
