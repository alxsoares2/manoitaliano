import { NextResponse } from "next/server";
import { MercadoPagoConfig, Payment } from "mercadopago";
import { supabaseAdmin as supabase } from "@/lib/supabase-admin";
import { sendWhatsappText, buildOrderConfirmationMessage } from "@/lib/zapi";

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
      .select("coupon_code, customer_name, customer_phone, total");

    const confirmed = updated?.[0];

    if (confirmed) {
      // Conta o uso do cupom só quando o PIX é efetivamente confirmado
      if (confirmed.coupon_code) {
        await supabase.rpc("increment_coupon_use", { p_code: confirmed.coupon_code });
      }

      // Confirmação por WhatsApp com link de acompanhamento em tempo real
      sendWhatsappText(
        confirmed.customer_phone,
        buildOrderConfirmationMessage(confirmed.customer_name, orderId, Number(confirmed.total))
      ).catch(() => {});
    }

    return NextResponse.json({ received: true });
  } catch (err) {
    console.error("Webhook error:", err);
    const { sendGroupAlert } = await import("@/lib/alertGroup");
    sendGroupAlert(String(err instanceof Error ? err.message : err), "/api/payment/webhook", "Verificar webhook do Mercado Pago").catch(() => {});
    return NextResponse.json({ error: "Webhook processing failed." }, { status: 500 });
  }
}
