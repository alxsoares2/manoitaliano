import { OrderStatus } from "@/types/database";

export const STATUS_FLOW: OrderStatus[] = [
  "recebido",
  "em_preparo",
  "saiu_para_entrega",
  "entregue",
];

export const STATUS_LABELS: Record<OrderStatus, string> = {
  pendente: "Aguardando pagamento",
  recebido: "Recebido",
  em_preparo: "Em preparo",
  saiu_para_entrega: "Saiu para entrega",
  entregue: "Entregue",
  cancelado: "Cancelado",
};

export function nextStatus(status: OrderStatus): OrderStatus | null {
  const index = STATUS_FLOW.indexOf(status);
  if (index === -1 || index === STATUS_FLOW.length - 1) return null;
  return STATUS_FLOW[index + 1];
}

export const STATUS_COLORS: Record<OrderStatus, string> = {
  pendente: "border-yellow-200 bg-yellow-50 text-yellow-700",
  recebido: "border-blue-200 bg-blue-50 text-blue-700",
  em_preparo: "border-orange-200 bg-orange-50 text-orange-700",
  saiu_para_entrega: "border-purple-200 bg-purple-50 text-purple-700",
  entregue: "border-green-200 bg-green-50 text-green-700",
  cancelado: "border-red-200 bg-red-50 text-red-700",
};
