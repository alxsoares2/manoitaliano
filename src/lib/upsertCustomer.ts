import { supabaseAdmin as supabase } from "@/lib/supabase-admin";
import { CustomerDetails } from "@/types/order";

export async function upsertCustomer(customer: CustomerDetails) {
  const phone = customer.phone.replace(/\D/g, "");
  if (!phone) return;

  // O trigger handle_new_order já cria/atualiza o cliente (e agrega total_spent /
  // orders_count) a cada pedido. Aqui só garantimos os dados de endereço/cep mais
  // recentes, sem tocar nos campos de agregação.
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
