"use client";

import { useEffect, useRef, useState } from "react";
import { supabase } from "@/lib/supabase";
import { OrderRecord, OrderStatus } from "@/types/database";
import { startAlertLoop, stopAlertLoop } from "@/lib/alertSound";
import { buildOutForDeliveryMessage, sendWhatsappMessage } from "@/lib/whatsapp";
import { printOrderReceipt } from "@/lib/printReceipt";
import KanbanBoard from "./KanbanBoard";
import DaySummary from "./DaySummary";
import CancelModal from "./CancelModal";

export default function OrdersDashboard() {
  const [orders, setOrders] = useState<OrderRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [cancelTarget, setCancelTarget] = useState<OrderRecord | null>(null);
  const alertActiveRef = useRef(false);

  // Verifica se há pedidos "recebido" e controla o loop de alerta
  const checkAlertState = (orderList: OrderRecord[]) => {
    const hasRecebido = orderList.some((o) => o.status === "recebido");
    if (hasRecebido && !alertActiveRef.current) {
      alertActiveRef.current = true;
      startAlertLoop();
    } else if (!hasRecebido && alertActiveRef.current) {
      alertActiveRef.current = false;
      stopAlertLoop();
    }
  };

  useEffect(() => {
    let active = true;

    supabase
      .from("orders")
      .select("*")
      .order("created_at", { ascending: false })
      .then(({ data }) => {
        if (active && data) {
          const typed = data as OrderRecord[];
          setOrders(typed);
          checkAlertState(typed);
        }
        if (active) setLoading(false);
      });

    const channel = supabase
      .channel("orders-changes")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "orders" },
        (payload) => {
          setOrders((prev) => {
            const next = [payload.new as OrderRecord, ...prev];
            checkAlertState(next);
            return next;
          });
        }
      )
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "orders" },
        (payload) => {
          const updated = payload.new as OrderRecord;
          setOrders((prev) => {
            const next = prev.map((o) => (o.id === updated.id ? updated : o));
            checkAlertState(next);
            return next;
          });
        }
      )
      .subscribe();

    return () => {
      active = false;
      supabase.removeChannel(channel);
      stopAlertLoop();
      alertActiveRef.current = false;
    };
  }, []);

  const handleAdvance = async (order: OrderRecord, status: OrderStatus) => {
    setOrders((prev) => {
      const next = prev.map((o) => (o.id === order.id ? { ...o, status } : o));
      checkAlertState(next);
      return next;
    });
    await supabase.from("orders").update({ status }).eq("id", order.id);

    // Impressão automática de 2 cópias ao avançar para "em_preparo"
    if (status === "em_preparo") {
      printOrderReceipt(order, 2);
    }

    if (status === "saiu_para_entrega") {
      sendWhatsappMessage(order.customer_phone, buildOutForDeliveryMessage(order)).catch(
        (error) => console.error("Erro ao enviar WhatsApp:", error)
      );
    }
  };

  const handleCancel = async (order: OrderRecord, reason: string) => {
    setCancelTarget(null);
    const status: OrderStatus = "cancelado";

    setOrders((prev) => {
      const next = prev.map((o) => (o.id === order.id ? { ...o, status } : o));
      checkAlertState(next);
      return next;
    });

    await supabase
      .from("orders")
      .update({ status, cancel_reason: reason })
      .eq("id", order.id);

    const orderNum = order.order_number ? `#${order.order_number}` : `#${order.id.slice(0, 8).toUpperCase()}`;
    const message =
      `Olá ${order.customer_name}, infelizmente seu pedido ${orderNum} da Basílico Pizzas foi cancelado. ` +
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
