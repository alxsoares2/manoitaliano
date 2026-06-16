"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { OrderRecord, OrderStatus } from "@/types/database";
import { playNewOrderAlert } from "@/lib/alertSound";
import { buildOutForDeliveryMessage, sendWhatsappMessage } from "@/lib/whatsapp";
import KanbanBoard from "./KanbanBoard";
import DaySummary from "./DaySummary";
import CancelModal from "./CancelModal";

export default function OrdersDashboard() {
  const [orders, setOrders] = useState<OrderRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [cancelTarget, setCancelTarget] = useState<OrderRecord | null>(null);

  useEffect(() => {
    let active = true;

    supabase
      .from("orders")
      .select("*")
      .order("created_at", { ascending: false })
      .then(({ data }) => {
        if (active && data) setOrders(data as OrderRecord[]);
        if (active) setLoading(false);
      });

    const channel = supabase
      .channel("orders-changes")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "orders" },
        (payload) => {
          setOrders((prev) => [payload.new as OrderRecord, ...prev]);
          playNewOrderAlert();
        }
      )
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "orders" },
        (payload) => {
          const updated = payload.new as OrderRecord;
          setOrders((prev) =>
            prev.map((order) => (order.id === updated.id ? updated : order))
          );
        }
      )
      .subscribe();

    return () => {
      active = false;
      supabase.removeChannel(channel);
    };
  }, []);

  const handleAdvance = async (order: OrderRecord, status: OrderStatus) => {
    setOrders((prev) =>
      prev.map((o) => (o.id === order.id ? { ...o, status } : o))
    );
    await supabase.from("orders").update({ status }).eq("id", order.id);

    if (status === "saiu_para_entrega") {
      sendWhatsappMessage(order.customer_phone, buildOutForDeliveryMessage(order)).catch(
        (error) => console.error("Erro ao enviar WhatsApp:", error)
      );
    }
  };

  const handleCancel = async (order: OrderRecord, reason: string) => {
    setCancelTarget(null);
    const status: OrderStatus = "cancelado";

    setOrders((prev) =>
      prev.map((o) => (o.id === order.id ? { ...o, status } : o))
    );

    await supabase
      .from("orders")
      .update({ status, cancel_reason: reason })
      .eq("id", order.id);

    const orderNumber = order.id.slice(0, 8).toUpperCase();
    const message =
      `Olá ${order.customer_name}, infelizmente seu pedido #${orderNumber} da Basílico Pizzas foi cancelado. ` +
      `Motivo: ${reason}. Entre em contato pelo (83) 99322-8832 para mais informações.`;

    sendWhatsappMessage(order.customer_phone, message).catch(
      (error) => console.error("Erro ao enviar WhatsApp de cancelamento:", error)
    );
  };

  return (
    <>
      <DaySummary orders={orders} />

      {loading ? (
        <p className="text-center text-sm text-muted">Carregando pedidos...</p>
      ) : orders.length === 0 ? (
        <p className="text-center text-sm text-muted">Nenhum pedido ainda.</p>
      ) : (
        <KanbanBoard
          orders={orders}
          onAdvance={handleAdvance}
          onCancel={(order) => setCancelTarget(order)}
        />
      )}

      {cancelTarget && (
        <CancelModal
          order={cancelTarget}
          onConfirm={handleCancel}
          onClose={() => setCancelTarget(null)}
        />
      )}
    </>
  );
}
