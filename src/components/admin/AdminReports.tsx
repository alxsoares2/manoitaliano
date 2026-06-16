"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";
import { OrderRecord } from "@/types/database";
import {
  ReportPreset,
  addDays,
  filterOrdersByDateRange,
  getPresetRange,
  getReportSummary,
  getTopItemsWithRevenue,
  startOfDay,
} from "@/lib/analytics";
import PeriodSelector from "./reports/PeriodSelector";
import ReportSummary from "./reports/ReportSummary";
import OrdersTable from "./reports/OrdersTable";
import TopItemsTable from "./reports/TopItemsTable";
import ExportCsvButton from "./reports/ExportCsvButton";

export default function AdminReports() {
  const [orders, setOrders] = useState<OrderRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [preset, setPreset] = useState<ReportPreset | "custom">("today");
  const [customStart, setCustomStart] = useState("");
  const [customEnd, setCustomEnd] = useState("");
  const [page, setPage] = useState(1);

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
      .channel("reports-orders-changes")
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

  const range = useMemo(() => {
    if (preset === "custom" && customStart && customEnd) {
      return {
        start: startOfDay(new Date(customStart)),
        end: addDays(startOfDay(new Date(customEnd)), 1),
      };
    }
    return getPresetRange(preset === "custom" ? "today" : preset);
  }, [preset, customStart, customEnd]);

  const filteredOrders = useMemo(
    () => filterOrdersByDateRange(orders, range.start, range.end),
    [orders, range]
  );

  const summary = useMemo(() => getReportSummary(filteredOrders), [filteredOrders]);
  const topItems = useMemo(() => getTopItemsWithRevenue(filteredOrders, 10), [filteredOrders]);

  const handleSelectPreset = (value: ReportPreset) => {
    setPreset(value);
    setCustomStart("");
    setCustomEnd("");
    setPage(1);
  };

  const handleCustomStartChange = (value: string) => {
    setCustomStart(value);
    if (value && customEnd) setPreset("custom");
    setPage(1);
  };

  const handleCustomEndChange = (value: string) => {
    setCustomEnd(value);
    if (customStart && value) setPreset("custom");
    setPage(1);
  };

  if (loading) {
    return <p className="text-center text-sm text-muted">Carregando dados...</p>;
  }

  return (
    <div className="space-y-6">
      <PeriodSelector
        preset={preset}
        onSelectPreset={handleSelectPreset}
        customStart={customStart}
        customEnd={customEnd}
        onChangeCustomStart={handleCustomStartChange}
        onChangeCustomEnd={handleCustomEndChange}
      />

      <ReportSummary summary={summary} />

      <div className="flex justify-end">
        <ExportCsvButton orders={filteredOrders} />
      </div>

      <OrdersTable orders={filteredOrders} page={page} onPageChange={setPage} />

      <TopItemsTable items={topItems} />
    </div>
  );
}
