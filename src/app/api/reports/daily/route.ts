import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";

const ZAPI_INSTANCE_ID = process.env.ZAPI_INSTANCE_ID!;
const ZAPI_TOKEN = process.env.ZAPI_TOKEN!;
const ZAPI_CLIENT_TOKEN = process.env.ZAPI_CLIENT_TOKEN;
const GROUP_ID = "120363144139588563-group";
const REPORT_SECRET = process.env.REPORT_SECRET ?? "basilico-report-2025";

async function sendGroupMessage(message: string) {
  const url = `https://api.z-api.io/instances/${ZAPI_INSTANCE_ID}/token/${ZAPI_TOKEN}/send-text`;
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (ZAPI_CLIENT_TOKEN) headers["Client-Token"] = ZAPI_CLIENT_TOKEN;

  await fetch(url, {
    method: "POST",
    headers,
    body: JSON.stringify({ phone: GROUP_ID, message }),
  });
}

export async function GET(request: Request) {
  // Proteção: só executa com secret correto (pg_cron ou manual)
  const { searchParams } = new URL(request.url);
  const secret = searchParams.get("secret");
  if (secret !== REPORT_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Dia em horário de Brasília
  const now = new Date();
  const brasiliaOffset = -3 * 60;
  const brasiliaTime = new Date(now.getTime() + (brasiliaOffset + now.getTimezoneOffset()) * 60000);
  const year = brasiliaTime.getFullYear();
  const month = String(brasiliaTime.getMonth() + 1).padStart(2, "0");
  const day = String(brasiliaTime.getDate()).padStart(2, "0");
  const dateStr = `${day}/${month}/${year}`;

  // Início e fim do dia em UTC (Brasília = UTC-3)
  const dayStartUTC = `${year}-${month}-${day}T03:00:00Z`;
  const dayEndUTC = new Date(new Date(dayStartUTC).getTime() + 24 * 60 * 60 * 1000).toISOString();

  const { data: orders } = await supabaseAdmin
    .from("orders")
    .select("*")
    .gte("created_at", dayStartUTC)
    .lt("created_at", dayEndUTC);

  if (!orders || orders.length === 0) {
    const msg = `📊 RELATÓRIO DO DIA — Mano Italiano\n\nData: ${dateStr}\n\nNenhum pedido registrado hoje.`;
    await sendGroupMessage(msg);
    return NextResponse.json({ ok: true, orders: 0 });
  }

  const nonCancelled = orders.filter((o) => o.status !== "cancelado");
  const cancelled = orders.filter((o) => o.status === "cancelado");
  const totalPedidos = orders.length;
  const faturamento = nonCancelled.reduce((sum, o) => sum + Number(o.total), 0);
  const ticketMedio = nonCancelled.length > 0 ? faturamento / nonCancelled.length : 0;

  // Item mais vendido
  const itemCount: Record<string, number> = {};
  for (const order of nonCancelled) {
    const items = order.items as { name: string; qty: number }[];
    for (const item of items) {
      itemCount[item.name] = (itemCount[item.name] || 0) + item.qty;
    }
  }
  let topItem = "—";
  let topQty = 0;
  for (const [name, qty] of Object.entries(itemCount)) {
    if (qty > topQty) { topItem = name; topQty = qty; }
  }

  // Canal: site vs WhatsApp
  // Pedidos pelo site têm payment_method definido na criação; WhatsApp cria via chatbot
  // Heurística: se tem payment_id E o pedido foi criado com status pendente → site
  // Simplificação: pedidos com coupon_code OU reference (campos do checkout do site) → site
  const siteOrders = nonCancelled.filter((o) => o.reference !== null || o.coupon_code !== null || (o.discount && Number(o.discount) > 0));
  const whatsappOrders = nonCancelled.length - siteOrders.length;

  const pagos = nonCancelled.filter((o) => o.status !== "pendente").length;

  const fmt = (v: number) => v.toFixed(2).replace(".", ",");

  const sep = "➖➖➖➖➖➖➖➖➖➖";
  const msg = [
    "📊 RELATÓRIO DO DIA — Mano Italiano",
    `Data: ${dateStr}`,
    sep,
    `🍕 Pedidos: ${totalPedidos}`,
    `💰 Faturamento: R$${fmt(faturamento)}`,
    `🎯 Ticket médio: R$${fmt(ticketMedio)}`,
    `⭐ Mais vendido: ${topItem} (${topQty}x)`,
    sep,
    `📱 Site: ${siteOrders.length} pedidos`,
    `💬 WhatsApp: ${whatsappOrders} pedidos`,
    sep,
    `✅ Pagos: ${pagos}`,
    `❌ Cancelados: ${cancelled.length}`,
  ].join("\n");

  await sendGroupMessage(msg);

  return NextResponse.json({ ok: true, orders: totalPedidos, revenue: faturamento });
}
