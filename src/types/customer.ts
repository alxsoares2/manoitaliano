export type CustomerRecord = {
  phone: string;
  name: string;
  address: string | null;
  address_number: string | null;
  neighborhood: string | null;
  complement: string | null;
  reference: string | null;
  total_spent: number;
  orders_count: number;
  first_order_at: string;
  last_order_at: string;
};
