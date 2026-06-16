import { NextResponse } from "next/server";
import { MercadoPagoConfig, Payment } from "mercadopago";
import { supabaseAdmin as supabase } from "@/lib/supabase-admin";
import { upsertCustomer } from "@/lib/upsertCustomer";

const mp = new MercadoPagoConfig({ accessToken: process.env.MP_ACCESS_TOKEN! });
const payment = new Payment(mp);

export async function POST(request: Request) {
  const { customer, items, total, cardToken, paymentMethodId, issuer, installments, cpf } =
    await request.json();

  if (!customer || !items || !total || !cardToken) {
    return NextResponse.json({ error: "Dados de pagamento incompletos." }, { status: 400 });
  }

  try {
    const mpPayment = await payment.create({
      body: {
        transaction_amount: total,
        token: cardToken,
        payment_method_id: paymentMethodId,
        issuer_id: issuer,
        installments: installments ?? 1,
        description: "Pedido Basílico Pizzas",
        payer: {
          email: "cliente@basilicopizzas.com.br",
          first_name: customer.name.split(" ")[0],
          last_name: customer.name.split(" ").slice(1).join(" ") || customer.name,
          identification: { type: "CPF", number: cpf?.replace(/\D/g, "") },
        },
      },
    });

    if (mpPayment.status !== "approved") {
      const detail = mpPayment.status_detail ?? "rejected";
      return NextResponse.json(
        { error: `Pagamento não aprovado (${detail}). Verifique os dados do cartão.` },
        { status: 402 }
      );
    }

    // Payment approved — create the order
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
        items,
        total,
        status: "recebido",
        payment_id: String(mpPayment.id),
      })
      .select("id")
      .single();

    if (orderError || !order) {
      return NextResponse.json({ error: "Pagamento aprovado, mas erro ao criar pedido. Contate-nos." }, { status: 500 });
    }

    await upsertCustomer(customer);

    return NextResponse.json({ success: true, orderId: order.id });
  } catch (err: unknown) {
    const detail = err instanceof Error ? err.message : JSON.stringify(err);
    console.error("MP card error:", detail);
    return NextResponse.json({ error: "Erro ao processar cartão. Tente novamente.", detail }, { status: 502 });
  }
}
