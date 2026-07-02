import { OrderRecord } from "@/types/database";
import { formatPrice } from "./format";

function esc(value: string): string {
  return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

export function buildReceiptHtml(order: OrderRecord): string {
  const orderNum = order.order_number ? `#${order.order_number}` : `#${order.id.slice(0, 8).toUpperCase()}`;
  const dateTime = new Date(order.created_at).toLocaleString("pt-BR", {
    day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit",
  });

  const channel = order.payment_method ? "Site" : "WhatsApp";

  const addressLines = [
    `${esc(order.address)}, ${esc(order.address_number)}`,
    order.complement ? esc(order.complement) : null,
    esc(order.neighborhood),
    order.reference ? `Ref: ${esc(order.reference)}` : null,
    order.cep ? `CEP: ${order.cep}` : null,
  ].filter(Boolean).join("<br>");

  const itemsHtml = order.items.map((item) => {
    const price = (item.unitPrice + (item.bordaPrice ?? 0)) * item.qty;
    let desc = `${item.qty}x ${esc(item.name)}`;
    if (item.size) desc += ` (${item.size})`;
    if (item.option) desc += ` — ${esc(item.option)}`;
    if (item.borda) desc += `<br><span class="detail">+ Borda ${esc(item.borda)}</span>`;
    return `<div class="item"><div class="item-row"><span>${desc}</span><span>${formatPrice(price)}</span></div></div>`;
  }).join("");

  const paymentLabel = order.payment_method === "pix" ? "PIX — JÁ PAGO" : order.payment_method === "card" ? "CARTÃO — JÁ PAGO" : "A DEFINIR";

  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="utf-8"/>
<title>Comanda ${orderNum}</title>
<style>
@page { size: 80mm auto; margin: 0; }
* { box-sizing: border-box; margin: 0; padding: 0; }
body { width: 80mm; max-width: 80mm; font-family: "Courier New", Courier, monospace; font-size: 13px; line-height: 1.4; color: #000; background: #fff; padding: 4mm 3mm 6mm; }
.order-num { background: #000; color: #fff; text-align: center; padding: 6mm 2mm; margin: 0 -3mm; font-size: 36px; font-weight: bold; letter-spacing: 2px; }
.brand { text-align: center; font-size: 14px; font-weight: bold; margin-top: 3mm; }
.brand-sub { text-align: center; font-size: 10px; margin-bottom: 2mm; }
hr { border: none; border-top: 2px dashed #000; margin: 3mm 0; }
.meta { font-size: 11px; }
.meta span { font-weight: bold; }
.section-title { font-size: 14px; font-weight: bold; text-align: center; letter-spacing: 1px; margin: 2mm 0; }
.item { margin-bottom: 2mm; }
.item-row { display: flex; justify-content: space-between; font-weight: bold; font-size: 14px; }
.detail { font-size: 11px; font-weight: normal; padding-left: 3mm; }
.obs-bar { background: #000; color: #fff; padding: 2mm 3mm; margin: 2mm -3mm; font-size: 14px; font-weight: bold; }
.total-row { display: flex; justify-content: space-between; font-size: 13px; }
.total-final { display: flex; justify-content: space-between; font-size: 20px; font-weight: bold; margin-top: 2mm; }
.payment { text-align: center; font-size: 13px; font-weight: bold; margin-top: 2mm; }
@media print { body { width: 80mm; max-width: 80mm; } }
</style>
</head>
<body>

<div class="order-num">${orderNum}</div>
<p class="brand">MANO ITALIANO</p>
<p class="brand-sub">Cucina Italiana</p>

<hr>

<div class="meta">
<p><span>Data:</span> ${dateTime}</p>
<p><span>Canal:</span> ${channel}</p>
</div>

<hr>

<div class="meta">
<p><span>Cliente:</span> ${esc(order.customer_name)}</p>
<p><span>Telefone:</span> ${esc(order.customer_phone)}</p>
<p><span>Endereço:</span><br>${addressLines}</p>
</div>

<hr>

<p class="section-title">ITENS DO PEDIDO</p>

${itemsHtml}

${order.notes && order.notes.trim() ? `<div class="obs-bar">OBS: ${esc(order.notes)}</div>` : ""}

<hr>

${order.subtotal && order.discount && Number(order.discount) > 0 ? `
<div class="total-row"><span>Subtotal</span><span>${formatPrice(Number(order.subtotal))}</span></div>
<div class="total-row"><span>Desconto${order.coupon_code ? ` (${esc(order.coupon_code)})` : ""}</span><span>-${formatPrice(Number(order.discount))}</span></div>
` : ""}
${order.delivery_fee && Number(order.delivery_fee) > 0 ? `<div class="total-row"><span>Frete</span><span>${formatPrice(Number(order.delivery_fee))}</span></div>` : ""}
<div class="total-final"><span>TOTAL</span><span>${formatPrice(order.total)}</span></div>

<hr>

<p class="payment">PAGAMENTO: ${paymentLabel}</p>

<hr>

<script>window.onload = function() { window.focus(); window.print(); }<\/script>
</body>
</html>`;
}

export function printOrderReceipt(order: OrderRecord, copies = 1) {
  for (let i = 0; i < copies; i++) {
    const w = window.open("", "_blank", "width=340,height=700");
    if (!w) return;
    w.document.open();
    w.document.write(buildReceiptHtml(order));
    w.document.close();
  }
}
