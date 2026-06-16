import { supabaseAdmin as supabase } from "@/lib/supabase-admin";
import { CustomerDetails } from "@/types/order";

export async function upsertCustomer(customer: CustomerDetails) {
  const phone = customer.phone.replace(/\D/g, "");
  if (!phone) return;

  await supabase.from("customers").upsert(
    {
      phone,
      name: customer.name,
      cep: customer.cep || null,
      address: customer.address,
      number: customer.number,
      neighborhood: customer.neighborhood,
      complement: customer.complement || null,
      reference: customer.reference || null,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "phone" }
  );
}
