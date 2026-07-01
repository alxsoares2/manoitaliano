import { NextResponse } from "next/server";
import { MercadoPagoConfig, Payment } from "mercadopago";
import { supabaseAdmin as supabase } from "@/lib/supabase-admin";
import { upsertCustomer } from "@/lib/upsertCustomer";
import { validateCoupon } from "@/lib/coupons";

const mp = new MercadoPagoConfig({ accessToken: process.env.MP_ACCESS_TOKEN! });
const payment = new Payment(mp);

export async function POST(request: Request) {
  const { customer, items, total, deliveryFee, couponCode } = await request.json();

  if (!customer || !items || !total) {
    return NextResponse.json({ error: "Dados do pedido incompletos." }, { status: 400 });
  }

  // Revalida o cupom server-side e recalcula o desconto
  const subtotal = total;
  const fee = Number(deliveryFee) || 0;
  let discount = 0;
  let appliedCoupon: string | null = null;
  let afterDiscount = subtotal;

  if (couponCode) {
    const result = await validateCoupon(supabase, couponCode, customer.phone, subtotal);
    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: 422 });
    }
    discount = result.discount;
    afterDiscount = result.finalTotal;
    appliedCoupon = result.coupon.code;
  }

  const finalTotal = afterDiscount + fee;

  // 1. Insert order as "pendente" first to get its ID
  const { data: order, error: orderError } = await supabase
    .from("orders")
    .insert({
      customer_name: customer.name,
      customer_phone: customer.phone,
      address: customer.address,
      address_number: customer.number,
      neighborhood: customer.neighborhood,
      complement: customer.complement || null,
      reference: customer.reference || null,
      cep: customer.cep || null,
      notes: customer.notes || null,
      items,
      subtotal,
      discount,
      delivery_fee: fee,
      coupon_code: appliedCoupon,
      total: finalTotal,
      status: "pendente",
      payment_method: "pix",
    })
    .select("id")
    .single();

  if (orderError || !order) {
    console.error("Supabase insert error:", JSON.stringify(orderError));
    return NextResponse.json(
      { error: "Erro ao criar pedido.", detail: orderError },
      { status: 500 }
    );
  }

  // 2. Create PIX payment on Mercado Pago
  try {
    const mpPayment = await payment.create({
      body: {
        transaction_amount: finalTotal,
        payment_method_id: "pix",
        description: "Pedido Mano Italiano",
        external_reference: order.id,
        notification_url: "https://manoitaliano.com.br/api/payment/webhook",
        payer: {
          email: "cliente@manoitaliano.com.br",
          first_name: customer.name.split(" ")[0],
          last_name: customer.name.split(" ").slice(1).join(" ") || customer.name,
        },
      },
    });

    const txInfo = mpPayment.point_of_interaction?.transaction_data;

    // 3. Save payment_id on order
    await supabase
      .from("orders")
      .update({ payment_id: String(mpPayment.id) })
      .eq("id", order.id);

    await upsertCustomer(customer);

    return NextResponse.json({
      orderId: order.id,
      paymentId: mpPayment.id,
      qrCode: txInfo?.qr_code,
      qrCodeBase64: txInfo?.qr_code_base64,
    });
  } catch (err) {
    // Clean up pending order if MP fails
    await supabase.from("orders").delete().eq("id", order.id);
    console.error("MP PIX error:", err);
    const { sendGroupAlert } = await import("@/lib/alertGroup");
    sendGroupAlert(
      String(err instanceof Error ? err.message : err),
      "/api/payment/create-pix",
      "Verificar credenciais do Mercado Pago e saldo da conta"
    ).catch(() => {});
    return NextResponse.json({ error: "Erro ao gerar PIX. Tente novamente." }, { status: 502 });
  }
}
