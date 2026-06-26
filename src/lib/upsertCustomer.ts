import { supabaseAdmin as supabase } from "@/lib/supabase-admin";
import { CustomerDetails } from "@/types/order";

/** Normaliza telefone: remove formatação e prefixo 55, retorna só DDD+número (11 dígitos) */
export function normalizePhone(raw: string): string {
  const digits = raw.replace(/\D/g, "");
  return digits.startsWith("55") && digits.length >= 12 ? digits.slice(2) : digits;
}

export async function upsertCustomer(customer: CustomerDetails) {
  const phone = normalizePhone(customer.phone);
  if (!phone) return;

  await supabase
    .from("customers")
    .update({
      name: customer.name,
      cep: customer.cep || null,
      address: customer.address,
      address_number: customer.number,
      neighborhood: customer.neighborhood,
      complement: customer.complement || null,
      reference: customer.reference || null,
    })
    .eq("phone", phone);
}
