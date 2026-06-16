"use client";

import { CustomerDetails } from "@/types/order";

export default function OrderSuccess({ details, onClose }: { details: CustomerDetails; onClose: () => void }) {
  return (
    <div className="flex h-full flex-col items-center justify-center px-6 text-center">
      <div className="mb-5 flex h-16 w-16 items-center justify-center rounded-full border-2 border-gold-soft bg-gold-soft/10 text-gold-soft">
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-8 w-8">
          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
        </svg>
      </div>
      <h2 className="font-display text-2xl font-semibold text-foreground">Pedido recebido!</h2>
      <p className="mt-3 max-w-xs text-sm leading-relaxed text-muted">
        Obrigado, {details.name.split(" ")[0]}! Em breve entraremos em contato pelo telefone{" "}
        <span className="font-medium text-foreground">{details.phone}</span> para confirmar.
      </p>
      <p className="mt-2 max-w-xs text-sm text-muted">
        Entrega em: {details.address}, {details.number} — {details.neighborhood}
      </p>
      <button
        onClick={onClose}
        className="mt-8 rounded-xl bg-foreground px-8 py-3 font-semibold text-background transition hover:bg-gold-soft"
      >
        Voltar ao cardápio
      </button>
    </div>
  );
}
