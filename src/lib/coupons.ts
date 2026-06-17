import type { SupabaseClient } from "@supabase/supabase-js";

export type CouponRecord = {
  code: string;
  type: "fixed" | "percent";
  value: number;
  max_uses: number | null;
  uses_count: number;
  max_uses_per_customer: number | null;
  valid_until: string | null;
  active: boolean;
};

export type CouponValidation =
  | { ok: true; coupon: CouponRecord; discount: number; finalTotal: number }
  | { ok: false; error: string };

function round2(n: number) {
  return Math.round(n * 100) / 100;
}

export function computeDiscount(coupon: CouponRecord, subtotal: number): number {
  const raw =
    coupon.type === "percent" ? (subtotal * coupon.value) / 100 : coupon.value;
  return round2(Math.min(raw, subtotal));
}

/**
 * Valida um cupom contra a tabela. Funciona com qualquer client Supabase
 * (anon para o checkout, service_role para o pagamento).
 */
export async function validateCoupon(
  supabase: SupabaseClient,
  rawCode: string,
  phone: string,
  subtotal: number
): Promise<CouponValidation> {
  const code = rawCode.trim().toUpperCase();
  if (!code) return { ok: false, error: "Informe um código de cupom." };

  const { data, error } = await supabase
    .from("coupons")
    .select("*")
    .eq("code", code)
    .maybeSingle();

  if (error || !data) return { ok: false, error: "Cupom não encontrado." };

  const coupon = data as CouponRecord;

  if (!coupon.active) return { ok: false, error: "Este cupom não está mais ativo." };

  if (coupon.valid_until && new Date(coupon.valid_until) < new Date()) {
    return { ok: false, error: "Este cupom expirou." };
  }

  if (coupon.max_uses != null && coupon.uses_count >= coupon.max_uses) {
    return { ok: false, error: "Este cupom atingiu o limite de usos." };
  }

  if (coupon.max_uses_per_customer != null) {
    const digits = phone.replace(/\D/g, "");
    if (digits.length >= 10) {
      const { count } = await supabase
        .from("orders")
        .select("id", { count: "exact", head: true })
        .eq("coupon_code", code)
        .eq("customer_phone", phone);

      if ((count ?? 0) >= coupon.max_uses_per_customer) {
        return { ok: false, error: "Você já usou este cupom o número máximo de vezes." };
      }
    }
  }

  const discount = computeDiscount(coupon, subtotal);
  return { ok: true, coupon, discount, finalTotal: round2(subtotal - discount) };
}
