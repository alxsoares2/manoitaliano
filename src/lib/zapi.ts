import { formatPhoneForWhatsapp } from "@/lib/whatsapp";

export const SITE_URL = "https://basilicopizzas.com.br";

/**
 * Envia mensagem de texto via Z-API direto do servidor (sem round-trip HTTP).
 * Lê as credenciais das env vars, incluindo o Client-Token de segurança.
 * Não lança erro — apenas retorna sucesso/falha para não quebrar o fluxo do pedido.
 */
export async function sendWhatsappText(phone: string, message: string): Promise<boolean> {
  const instanceId = process.env.ZAPI_INSTANCE_ID;
  const token = process.env.ZAPI_TOKEN;
  const clientToken = process.env.ZAPI_CLIENT_TOKEN;
  if (!instanceId || !token) return false;

  const url = `https://api.z-api.io/instances/${instanceId}/token/${token}/send-text`;
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (clientToken) headers["Client-Token"] = clientToken;

  try {
    const res = await fetch(url, {
      method: "POST",
      headers,
      body: JSON.stringify({ phone: formatPhoneForWhatsapp(phone), message }),
    });
    return res.ok;
  } catch {
    return false;
  }
}

export function buildOrderConfirmationMessage(
  name: string,
  orderId: string,
  total: number
): string {
  const firstName = name.trim().split(" ")[0] || name;
  const orderNumber = orderId.slice(0, 8).toUpperCase();
  const totalStr = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(total);
  return (
    `Olá ${firstName}! 🍕 Seu pedido #${orderNumber} na Basílico Pizzas foi confirmado — total ${totalStr}.\n\n` +
    `Acompanhe em tempo real: ${SITE_URL}/pedido/${orderId}`
  );
}
