import { NextResponse } from "next/server";
import { MercadoPagoConfig, Payment } from "mercadopago";
import { supabaseAdmin as supabase } from "@/lib/supabase-admin";
import { friendlyCardError } from "@/lib/mpErrors";
import { notifyGroupNewOrder } from "@/lib/alertGroup";
import { sendWhatsappText, buildOrderConfirmationMessage } from "@/lib/zapi";

const mp = new MercadoPagoConfig({ accessToken: process.env.MP_ACCESS_TOKEN! });
const payment = new Payment(mp);

export async function POST(request: Request) {
  const { orderId, cardToken, paymentMethodId, issuer, cpf } = await request.json();

  if (!orderId || !cardToken) {
    return NextResponse.json({ error: "Dados incompletos." }, { status: 400 });
  }

  const { data: order, error: fetchError } = await supabase
    .from("orders")
    .select("*")
    .eq("id", orderId)
    .eq("status", "pendente")
    .single();

  if (fetchError || !order) {
    return NextResponse.json({ error: "Pedido não encontrado ou já processado." }, { status: 404 });
  }

  try {
    const mpPayment = await payment.create({
      body: {
        transaction_amount: Number(order.total),
        payment_method_id: paymentMethodId,
        issuer_id: issuer ? Number(issuer) : undefined,
        token: cardToken,
        installments: 1,
        description: "Pedido Mano Italiano",
        external_reference: orderId,
        payer: {
          email: "cliente@manoitaliano.com.br",
          first_name: order.customer_name.split(" ")[0],
          last_name: order.customer_name.split(" ").slice(1).join(" ") || order.customer_name,
          identification: { type: "CPF", number: cpf?.replace(/\D/g, "") ?? "00000000000" },
        },
      },
    });

    if (mpPayment.status === "approved") {
      await supabase
        .from("orders")
        .update({ status: "recebido", payment_id: String(mpPayment.id), payment_method: "card" })
        .eq("id", orderId);

      const { data: fullOrder } = await supabase
        .from("orders")
        .select("customer_name, customer_phone, total, order_number, items, neighborhood, notes")
        .eq("id", orderId)
        .single();

      if (fullOrder) {
        sendWhatsappText(
          fullOrder.customer_phone,
          buildOrderConfirmationMessage(fullOrder.customer_name, orderId, Number(fullOrder.total))
        ).catch(() => {});

        const itemLines = Array.isArray(fullOrder.items)
          ? fullOrder.items.map((it: { name: string; quantity?: number }) => `• ${it.quantity ?? 1}x ${it.name}`).join("\n")
          : "";
        notifyGroupNewOrder({
          orderNum: fullOrder.order_number ?? orderId.slice(-6),
          orderId,
          customerName: fullOrder.customer_name,
          neighborhood: fullOrder.neighborhood ?? "-",
          items: itemLines,
          total: Number(fullOrder.total),
          paymentMethod: "card",
          notes: fullOrder.notes,
        }).catch(() => {});
      }

      return NextResponse.json({ status: "approved", orderId });
    }

    const msg = friendlyCardError(mpPayment.status_detail ?? mpPayment.status ?? "unknown");
    return NextResponse.json({ error: msg }, { status: 422 });
  } catch (err) {
    console.error("pay-order error:", err);
    const { sendGroupAlert } = await import("@/lib/alertGroup");
    sendGroupAlert(
      String(err instanceof Error ? err.message : err),
      "/api/payment/pay-order",
      "Verificar credenciais do Mercado Pago e dados do cartão"
    ).catch(() => {});
    return NextResponse.json({ error: "Erro ao processar cartão." }, { status: 502 });
  }
}
