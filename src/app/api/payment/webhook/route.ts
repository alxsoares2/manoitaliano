import { NextResponse } from "next/server";
import { MercadoPagoConfig, Payment } from "mercadopago";
import { supabaseAdmin as supabase } from "@/lib/supabase-admin";
import { sendWhatsappText, buildOrderConfirmationMessage } from "@/lib/zapi";
import { notifyGroupNewOrder } from "@/lib/alertGroup";

const mp = new MercadoPagoConfig({ accessToken: process.env.MP_ACCESS_TOKEN! });
const payment = new Payment(mp);

export async function POST(request: Request) {
  const body = await request.json();

  // MP sends { type: "payment", data: { id: "..." } }
  if (body.type !== "payment" || !body.data?.id) {
    return NextResponse.json({ received: true });
  }

  try {
    const mpPayment = await payment.get({ id: body.data.id });

    if (mpPayment.status !== "approved") {
      return NextResponse.json({ received: true });
    }

    const orderId = mpPayment.external_reference;
    if (!orderId) return NextResponse.json({ received: true });

    const { data: updated } = await supabase
      .from("orders")
      .update({ status: "recebido" })
      .eq("id", orderId)
      .eq("status", "pendente")
      .select("coupon_code, customer_name, customer_phone, total, order_number, items, neighborhood, notes");

    const confirmed = updated?.[0];

    if (confirmed) {
      if (confirmed.coupon_code) {
        await supabase.rpc("increment_coupon_use", { p_code: confirmed.coupon_code });
      }

      sendWhatsappText(
        confirmed.customer_phone,
        buildOrderConfirmationMessage(confirmed.customer_name, orderId, Number(confirmed.total))
      ).catch(() => {});

      const itemLines = Array.isArray(confirmed.items)
        ? confirmed.items.map((it: { name: string; quantity?: number }) => `• ${it.quantity ?? 1}x ${it.name}`).join("\n")
        : "";
      notifyGroupNewOrder({
        orderNum: confirmed.order_number ?? orderId.slice(-6),
        orderId,
        customerName: confirmed.customer_name,
        neighborhood: confirmed.neighborhood ?? "-",
        items: itemLines,
        total: Number(confirmed.total),
        paymentMethod: "pix",
        notes: confirmed.notes,
      }).catch(() => {});
    }

    return NextResponse.json({ received: true });
  } catch (err) {
    console.error("Webhook error:", err);
    const { sendGroupAlert } = await import("@/lib/alertGroup");
    sendGroupAlert(String(err instanceof Error ? err.message : err), "/api/payment/webhook", "Verificar webhook do Mercado Pago").catch(() => {});
    return NextResponse.json({ error: "Webhook processing failed." }, { status: 500 });
  }
}
