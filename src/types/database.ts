export type OrderStatus =
  | "pendente"
  | "recebido"
  | "em_preparo"
  | "saiu_para_entrega"
  | "entregue"
  | "cancelado";

export type OrderItemRecord = {
  name: string;
  size?: string;
  borda?: string;
  option?: string;
  qty: number;
  unitPrice: number;
  bordaPrice?: number;
};

export type OrderRecord = {
  id: string;
  created_at: string;
  customer_name: string;
  customer_phone: string;
  address: string;
  address_number: string;
  neighborhood: string;
  complement: string | null;
  reference: string | null;
  items: OrderItemRecord[];
  total: number;
  status: OrderStatus;
};

export type OrderInsert = Omit<OrderRecord, "id" | "created_at" | "status"> & {
  status?: OrderStatus;
};
