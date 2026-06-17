import { NextResponse } from "next/server";
import { MercadoPagoConfig, Payment } from "mercadopago";
import { supabaseAdmin as supabase } from "@/lib/supabase-admin";
import { upsertCustomer } from "@/lib/upsertCustomer";
import { validateCoupon } from "@/lib/coupons";

const mp = new MercadoPagoConfig({ accessToken: process.env.MP_ACCESS_TOKEN! });
const payment = new Payment(mp);

export async function POST(request: Request) {
  const { customer, items, total, cardToken, paymentMethodId, issuer, installments, cpf, couponCode } =
    await request.json();

  if (!customer || !items || !total || !cardToken) {
    return NextResponse.json({ error: "Dados de pagamento incompletos." }, { status: 400 });
  }

  // Revalida o cupom server-side e recalcula o desconto
  const subtotal = total;
  let discount = 0;
  let appliedCoupon: string | null = null;
  let finalTotal = subtotal;

  if (couponCode) {
    const result = await validateCoupon(supabase, couponCode, customer.phone, subtotal);
    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: 422 });
    }
    discount = result.discount;
    finalTotal = result.finalTotal;
    appliedCoupon = result.coupon.code;
  }

  try {
    const mpPayment = await payment.create({
      body: {
        transaction_amount: finalTotal,
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
        subtotal,
        discount,
        coupon_code: appliedCoupon,
        total: finalTotal,
        status: "recebido",
        payment_id: String(mpPayment.id),
      })
      .select("id")
      .single();

    if (orderError || !order) {
      return NextResponse.json({ error: "Pagamento aprovado, mas erro ao criar pedido. Contate-nos." }, { status: 500 });
    }

    if (appliedCoupon) {
      await supabase.rpc("increment_coupon_use", { p_code: appliedCoupon });
    }

    await upsertCustomer(customer);

    return NextResponse.json({ success: true, orderId: order.id });
  } catch (err: unknown) {
    const detail = err instanceof Error ? err.message : JSON.stringify(err);
    console.error("MP card error:", detail);
    return NextResponse.json({ error: "Erro ao processar cartão. Tente novamente.", detail }, { status: 502 });
  }
}
