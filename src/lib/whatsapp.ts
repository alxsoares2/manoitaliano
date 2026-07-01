import { OrderRecord } from "@/types/database";

export function formatPhoneForWhatsapp(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  return digits.startsWith("55") ? digits : `55${digits}`;
}

export function buildWhatsappLink(phone: string, message?: string): string {
  const number = formatPhoneForWhatsapp(phone);
  const text = message ? `&text=${encodeURIComponent(message)}` : "";
  return `https://web.whatsapp.com/send?phone=${number}${text}`;
}

export function buildOutForDeliveryMessage(order: OrderRecord): string {
  const orderNumber = order.order_number ? `#${order.order_number}` : `#${order.id.slice(0, 8).toUpperCase()}`;
  return `Olá ${order.customer_name}! 🍕 Seu pedido da Mano Italiano ${orderNumber} saiu para entrega e chegará em breve. Obrigado pela preferência!`;
}

export async function sendWhatsappMessage(phone: string, message: string): Promise<void> {
  const response = await fetch("/api/whatsapp/send", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ phone, message }),
  });

  if (!response.ok) {
    const data = await response.json().catch(() => null);
    throw new Error(data?.error ?? "Falha ao enviar mensagem via WhatsApp.");
  }
}
