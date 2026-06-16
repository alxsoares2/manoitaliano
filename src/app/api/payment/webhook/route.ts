import { NextResponse } from "next/server";
import { MercadoPagoConfig, Payment } from "mercadopago";
import { supabaseAdmin as supabase } from "@/lib/supabase-admin";

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

    await supabase
      .from("orders")
      .update({ status: "recebido" })
      .eq("id", orderId)
      .eq("status", "pendente");

    return NextResponse.json({ received: true });
  } catch (err) {
    console.error("Webhook error:", err);
    return NextResponse.json({ error: "Webhook processing failed." }, { status: 500 });
  }
}
