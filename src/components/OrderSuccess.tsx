"use client";

import { CustomerDetails } from "@/types/order";

export default function OrderSuccess({
  details,
  onClose,
}: {
  details: CustomerDetails;
  onClose: () => void;
}) {
  return (
    <div className="flex h-full flex-col items-center justify-center px-6 text-center">
      <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full border border-gold bg-gold/10 text-gold">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          className="h-8 w-8"
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
        </svg>
      </div>
      <h2 className="font-display text-2xl font-semibold text-gold-soft">
        Pedido recebido!
      </h2>
      <p className="mt-2 max-w-xs text-sm text-muted">
        Obrigado, {details.name.split(" ")[0]}! Em breve entraremos em contato
        pelo telefone {details.phone} para confirmar seu pedido.
      </p>
      <p className="mt-1 max-w-xs text-sm text-muted">
        Endereço de entrega: {details.address}, {details.number} —{" "}
        {details.neighborhood}
      </p>
      <button
        onClick={onClose}
        className="mt-6 rounded-xl bg-gold px-6 py-3 font-semibold text-background transition hover:bg-gold-soft"
      >
        Voltar ao cardápio
      </button>
    </div>
  );
}
