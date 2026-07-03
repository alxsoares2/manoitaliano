const ZAPI_INSTANCE_ID = process.env.ZAPI_INSTANCE_ID!;
const ZAPI_TOKEN = process.env.ZAPI_TOKEN!;
const ZAPI_CLIENT_TOKEN = process.env.ZAPI_CLIENT_TOKEN;
const GROUP_ID = "120363144139588563-group";

let lastAlertKey = "";
let lastAlertTime = 0;
const DEDUP_MS = 60_000;

function zapiSend(phone: string, message: string) {
  const url = `https://api.z-api.io/instances/${ZAPI_INSTANCE_ID}/token/${ZAPI_TOKEN}/send-text`;
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (ZAPI_CLIENT_TOKEN) headers["Client-Token"] = ZAPI_CLIENT_TOKEN;
  return fetch(url, {
    method: "POST",
    headers,
    body: JSON.stringify({ phone, message }),
  });
}

export async function sendGroupMessage(message: string) {
  try {
    await zapiSend(GROUP_ID, message);
  } catch {
    console.error("[alertGroup] Failed to send message to group");
  }
}

export async function notifyGroupNewOrder(params: {
  orderNum: number | string;
  orderId: string;
  customerName: string;
  neighborhood: string;
  items: string;
  total: number;
  paymentMethod: string;
  notes?: string | null;
}) {
  const hora = new Date().toLocaleString("pt-BR", {
    timeZone: "America/Recife",
    hour: "2-digit", minute: "2-digit",
  });

  const payment = params.paymentMethod === "pix" ? "PIX" : params.paymentMethod === "card" ? "Cartão" : params.paymentMethod;

  const lines = [
    `🍝 NOVO PEDIDO #${params.orderNum}`,
    ``,
    `👤 ${params.customerName}`,
    `📍 ${params.neighborhood}`,
    `💳 ${payment}`,
    `🕐 ${hora}`,
    ``,
    `📋 Itens:`,
    params.items,
    ``,
    `💰 Total: R$ ${Number(params.total).toFixed(2).replace(".", ",")}`,
  ];

  if (params.notes) lines.push(``, `📝 ${params.notes}`);
  lines.push(``, `🔗 manoitaliano.com.br/admin`);

  await sendGroupMessage(lines.join("\n"));
}

export async function sendGroupAlert(error: string, route: string, action: string) {
  const key = `${route}:${error.slice(0, 50)}`;
  const now = Date.now();
  if (key === lastAlertKey && now - lastAlertTime < DEDUP_MS) return;
  lastAlertKey = key;
  lastAlertTime = now;

  const hora = new Date().toLocaleString("pt-BR", {
    timeZone: "America/Recife",
    day: "2-digit", month: "2-digit", year: "numeric",
    hour: "2-digit", minute: "2-digit", second: "2-digit",
  });

  const message = `🚨 ALERTA MANO ITALIANO\n\nErro: ${error}\n\nRota: ${route}\n\nHorário: ${hora}\n\nAção necessária: ${action}`;

  try {
    await zapiSend(GROUP_ID, message);
  } catch {
    console.error("[alertGroup] Failed to send alert to group");
  }
}
