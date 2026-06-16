"use client";

import { FormEvent, useState } from "react";
import { useCart } from "@/context/CartContext";
import { formatPrice } from "@/lib/format";
import { formatPhone } from "@/lib/phone";
import { CustomerDetails, emptyCustomerDetails } from "@/types/order";

type Errors = Partial<Record<keyof CustomerDetails, string>>;

export default function CheckoutForm({
  onBack,
  onSubmit,
}: {
  onBack: () => void;
  onSubmit: (details: CustomerDetails) => void;
}) {
  const { totalPrice } = useCart();
  const [details, setDetails] = useState<CustomerDetails>(emptyCustomerDetails);
  const [errors, setErrors] = useState<Errors>({});

  const update = (field: keyof CustomerDetails, value: string) => {
    setDetails((prev) => ({ ...prev, [field]: value }));
  };

  const validate = (): boolean => {
    const next: Errors = {};
    if (!details.name.trim()) next.name = "Informe seu nome";
    if (details.phone.replace(/\D/g, "").length < 10)
      next.phone = "Informe um telefone válido";
    if (!details.address.trim()) next.address = "Informe a rua";
    if (!details.number.trim()) next.number = "Informe o número";
    if (!details.neighborhood.trim()) next.neighborhood = "Informe o bairro";
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    onSubmit(details);
  };

  const inputClass = (hasError?: string) =>
    `w-full rounded-lg border bg-background px-3 py-2.5 text-sm text-foreground placeholder:text-muted/60 outline-none transition focus:border-gold ${
      hasError ? "border-red-400" : "border-border"
    }`;

  return (
    <form onSubmit={handleSubmit} className="flex h-full flex-col">
      <div className="flex items-center gap-3 border-b border-border px-5 py-4">
        <button
          type="button"
          onClick={onBack}
          className="rounded-full border border-border p-2 text-muted transition hover:border-gold hover:text-gold-soft"
          aria-label="Voltar ao carrinho"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            className="h-4 w-4"
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 6l-6 6 6 6" />
          </svg>
        </button>
        <h2 className="font-display text-xl font-semibold text-gold-soft">
          Finalizar pedido
        </h2>
      </div>

      <div className="flex-1 space-y-4 overflow-y-auto px-5 py-4">
        <div>
          <label className="mb-1 block text-xs font-semibold uppercase tracking-widest text-gold">
            Nome completo
          </label>
          <input
            type="text"
            value={details.name}
            onChange={(e) => update("name", e.target.value)}
            placeholder="Seu nome"
            className={inputClass(errors.name)}
            autoComplete="name"
          />
          {errors.name && (
            <p className="mt-1 text-xs text-red-400">{errors.name}</p>
          )}
        </div>

        <div>
          <label className="mb-1 block text-xs font-semibold uppercase tracking-widest text-gold">
            Telefone / WhatsApp
          </label>
          <input
            type="tel"
            inputMode="numeric"
            value={details.phone}
            onChange={(e) => update("phone", formatPhone(e.target.value))}
            placeholder="(83) 99999-9999"
            className={inputClass(errors.phone)}
            autoComplete="tel"
          />
          {errors.phone && (
            <p className="mt-1 text-xs text-red-400">{errors.phone}</p>
          )}
        </div>

        <div className="grid grid-cols-3 gap-3">
          <div className="col-span-2">
            <label className="mb-1 block text-xs font-semibold uppercase tracking-widest text-gold">
              Rua
            </label>
            <input
              type="text"
              value={details.address}
              onChange={(e) => update("address", e.target.value)}
              placeholder="Nome da rua"
              className={inputClass(errors.address)}
              autoComplete="address-line1"
            />
            {errors.address && (
              <p className="mt-1 text-xs text-red-400">{errors.address}</p>
            )}
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold uppercase tracking-widest text-gold">
              Número
            </label>
            <input
              type="text"
              inputMode="numeric"
              value={details.number}
              onChange={(e) => update("number", e.target.value)}
              placeholder="123"
              className={inputClass(errors.number)}
            />
            {errors.number && (
              <p className="mt-1 text-xs text-red-400">{errors.number}</p>
            )}
          </div>
        </div>

        <div>
          <label className="mb-1 block text-xs font-semibold uppercase tracking-widest text-gold">
            Bairro
          </label>
          <input
            type="text"
            value={details.neighborhood}
            onChange={(e) => update("neighborhood", e.target.value)}
            placeholder="Seu bairro"
            className={inputClass(errors.neighborhood)}
            autoComplete="address-level2"
          />
          {errors.neighborhood && (
            <p className="mt-1 text-xs text-red-400">{errors.neighborhood}</p>
          )}
        </div>

        <div>
          <label className="mb-1 block text-xs font-semibold uppercase tracking-widest text-gold">
            Complemento (opcional)
          </label>
          <input
            type="text"
            value={details.complement}
            onChange={(e) => update("complement", e.target.value)}
            placeholder="Apto, bloco, casa..."
            className={inputClass()}
          />
        </div>

        <div>
          <label className="mb-1 block text-xs font-semibold uppercase tracking-widest text-gold">
            Ponto de referência (opcional)
          </label>
          <input
            type="text"
            value={details.reference}
            onChange={(e) => update("reference", e.target.value)}
            placeholder="Próximo a..."
            className={inputClass()}
          />
        </div>
      </div>

      <div className="border-t border-border px-5 py-4">
        <div className="mb-3 flex items-center justify-between text-lg">
          <span className="text-muted">Total</span>
          <span className="font-display font-semibold text-gold-soft">
            {formatPrice(totalPrice)}
          </span>
        </div>
        <button
          type="submit"
          className="w-full rounded-xl bg-gold px-5 py-3.5 font-semibold text-background transition hover:bg-gold-soft"
        >
          Escolher pagamento →
        </button>
      </div>
    </form>
  );
}
