import { OrderRecord } from "@/types/database";
import { formatPrice } from "./format";

export function buildReceiptHtml(order: OrderRecord): string {
  const orderNumber = order.id.slice(0, 8).toUpperCase();
  const dateTime = new Date(order.created_at).toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

  const addressLines = [
    `${order.address}, ${order.address_number}`,
    order.neighborhood,
    order.complement || null,
    order.reference ? `Ref: ${order.reference}` : null,
  ]
    .filter(Boolean)
    .join("<br>");

  const itemsHtml = order.items
    .map((item) => {
      const details = [
        item.size ? `Tam: ${item.size}` : null,
        item.option || null,
        item.borda ? `Borda: ${item.borda}` : null,
      ]
        .filter(Boolean)
        .join(" — ");

      return `
        <div class="item">
          <div class="item-line">
            <span>${item.qty}x ${escapeHtml(item.name)}</span>
            <span>${formatPrice((item.unitPrice + (item.bordaPrice ?? 0)) * item.qty)}</span>
          </div>
          ${details ? `<div class="item-details">${escapeHtml(details)}</div>` : ""}
        </div>
      `;
    })
    .join("");

  const html = `
    <!DOCTYPE html>
    <html lang="pt-BR">
      <head>
        <meta charset="utf-8" />
        <title>Comanda #${orderNumber}</title>
        <style>
          @page {
            size: 80mm auto;
            margin: 0;
          }
          * {
            box-sizing: border-box;
          }
          body {
            width: 80mm;
            margin: 0;
            padding: 8px;
            font-family: "Courier New", monospace;
            font-size: 16px;
            line-height: 1.4;
            color: #000;
            background: #fff;
          }
          h1 {
            font-size: 20px;
            text-align: center;
            margin: 0 0 4px;
          }
          .center {
            text-align: center;
          }
          .meta {
            margin-bottom: 8px;
          }
          .row {
            display: flex;
            justify-content: space-between;
            font-weight: bold;
          }
          hr {
            border: none;
            border-top: 2px dashed #000;
            margin: 8px 0;
          }
          .item {
            margin-bottom: 6px;
          }
          .item-line {
            display: flex;
            justify-content: space-between;
            font-weight: bold;
          }
          .item-details {
            font-size: 14px;
            padding-left: 12px;
          }
          .total {
            display: flex;
            justify-content: space-between;
            font-size: 20px;
            font-weight: bold;
            margin-top: 8px;
          }
        </style>
      </head>
      <body>
        <h1>Basílico Pizzas</h1>
        <div class="center meta">Pedido #${orderNumber}<br>${dateTime}</div>

        <div class="row"><span>Cliente:</span></div>
        <div>${escapeHtml(order.customer_name)}</div>

        <div class="row"><span>Telefone:</span></div>
        <div>${escapeHtml(order.customer_phone)}</div>

        <div class="row"><span>Endereço:</span></div>
        <div>${addressLines}</div>

        <hr>

        ${itemsHtml}

        <hr>

        <div class="total"><span>Total</span><span>${formatPrice(order.total)}</span></div>

        <hr>
      </body>
    </html>
  `;

  return html;
}

export function printOrderReceipt(order: OrderRecord) {
  const printWindow = window.open("", "_blank", "width=320,height=600");
  if (!printWindow) return;

  printWindow.document.open();
  printWindow.document.write(buildReceiptHtml(order));
  printWindow.document.close();

  printWindow.onload = () => {
    printWindow.focus();
    printWindow.print();
  };
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
