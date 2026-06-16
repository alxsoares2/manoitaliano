import { NextResponse } from "next/server";
import { MercadoPagoConfig, Payment } from "mercadopago";
import { supabaseAdmin as supabase } from "@/lib/supabase-admin";

const mp = new MercadoPagoConfig({ accessToken: process.env.MP_ACCESS_TOKEN! });
const payment = new Payment(mp);

export async function POST(request: Request) {
  const { customer, items, total } = await request.json();

  if (!customer || !items || !total) {
    return NextResponse.json({ error: "Dados do pedido incompletos." }, { status: 400 });
  }

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
      items,
      total,
      status: "pendente",
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
        transaction_amount: total,
        payment_method_id: "pix",
        description: "Pedido Basílico Pizzas",
        external_reference: order.id,
        payer: {
          email: "cliente@basilicopizzas.com.br",
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
    return NextResponse.json({ error: "Erro ao gerar PIX. Tente novamente." }, { status: 502 });
  }
}
