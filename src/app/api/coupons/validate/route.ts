import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { validateCoupon } from "@/lib/coupons";

export async function POST(request: Request) {
  const { code, phone, subtotal } = await request.json();

  if (!code || typeof subtotal !== "number") {
    return NextResponse.json({ error: "Dados incompletos." }, { status: 400 });
  }

  const result = await validateCoupon(supabaseAdmin, code, phone ?? "", subtotal);

  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 422 });
  }

  return NextResponse.json({
    code: result.coupon.code,
    type: result.coupon.type,
    value: result.coupon.value,
    discount: result.discount,
    finalTotal: result.finalTotal,
  });
}
