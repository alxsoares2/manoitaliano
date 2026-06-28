"use client";

import { OrderRecord } from "@/types/database";
import { STATUS_LABELS } from "@/lib/orderStatus";

function escapeCsvField(value: string): string {
  if (/[",\n;]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

function buildCsv(orders: OrderRecord[]): string {
  const header = [
    "Data",
    "Numero do pedido",
    "Cliente",
    "Telefone",
    "Endereco",
    "Itens",
    "Total",
    "Status",
  ];

  const rows = orders.map((order) => {
    const date = new Date(order.created_at).toLocaleString("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });

    const address = [
      `${order.address}, ${order.address_number}`,
      order.neighborhood,
      order.complement,
    ]
      .filter(Boolean)
      .join(" - ");

    const items = order.items
      .map((item) => `${item.qty}x ${item.name}${item.size ? ` (${item.size})` : ""}`)
      .join("; ");

    return [
      date,
      order.order_number ? `#${order.order_number}` : `#${order.id.slice(0, 8).toUpperCase()}`,
      order.customer_name,
      order.customer_phone,
      address,
      items,
      order.total.toFixed(2).replace(".", ","),
      STATUS_LABELS[order.status],
    ];
  });

  return [header, ...rows]
    .map((row) => row.map(escapeCsvField).join(";"))
    .join("\n");
}

export default function ExportCsvButton({ orders }: { orders: OrderRecord[] }) {
  const handleExport = () => {
    const csv = "﻿" + buildCsv(orders);
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);

    const link = document.createElement("a");
    link.href = url;
    link.download = `pedidos-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();

    URL.revokeObjectURL(url);
  };

  return (
    <button
      onClick={handleExport}
      disabled={orders.length === 0}
      className="rounded-full bg-gold px-5 py-2 text-sm font-semibold text-white transition hover:bg-gold-soft disabled:cursor-not-allowed disabled:opacity-40"
    >
      Exportar CSV
    </button>
  );
}
