"use client";

import { FormEvent, useState } from "react";
import { useCart } from "@/context/CartContext";
import { formatPrice } from "@/lib/format";
import { formatPhone } from "@/lib/phone";
import { lookupFrete } from "@/data/frete";
import { CustomerDetails, emptyCustomerDetails } from "@/types/order";

type Errors = Partial<Record<keyof CustomerDetails, string>>;

const labelClass = "mb-1 block text-xs font-semibold uppercase tracking-widest text-muted";
const inputBase = "w-full rounded-lg border bg-background px-3 py-2.5 text-sm text-foreground placeholder:text-muted/50 outline-none transition focus:border-foreground";

function formatCep(value: string) {
  const digits = value.replace(/\D/g, "").slice(0, 8);
  if (digits.length > 5) return digits.slice(0, 5) + "-" + digits.slice(5);
  return digits;
}

export default function CheckoutForm({ onBack, onSubmit }: { onBack: () => void; onSubmit: (details: CustomerDetails, deliveryFee: number) => void }) {
  const { totalPrice } = useCart();
  const [details, setDetails] = useState<CustomerDetails>(emptyCustomerDetails);
  const [errors, setErrors] = useState<Errors>({});
  const [welcome, setWelcome] = useState<string | null>(null);
  const [cepLoading, setCepLoading] = useState(false);

  // Frete calculado pelo bairro. undefined = ainda não informado; null = fora da cobertura.
  const deliveryFee =
    details.neighborhood.trim() === "" ? undefined : lookupFrete(details.neighborhood);
  const freteNotFound = details.neighborhood.trim() !== "" && deliveryFee == null;
  const orderTotal = totalPrice + (deliveryFee ?? 0);

  const update = (field: keyof CustomerDetails, value: string) => {
    setDetails((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) setErrors((prev) => ({ ...prev, [field]: undefined }));
  };

  const handleCepBlur = async () => {
    const digits = details.cep.replace(/\D/g, "");
    if (digits.length !== 8) return;

    setCepLoading(true);
    setErrors((prev) => ({ ...prev, cep: undefined }));

    try {
      const res = await fetch(`https://viacep.com.br/ws/${digits}/json/`);
      const data = await res.json();

      if (data.erro) {
        setErrors((prev) => ({ ...prev, cep: "CEP não encontrado" }));
        return;
      }

      setDetails((prev) => {
        const newAddress = data.logradouro || prev.address;
        // Só limpa o número se o logradouro mudou (novo CEP digitado manualmente)
        const addressChanged = data.logradouro && data.logradouro !== prev.address;
        return {
          ...prev,
          address: newAddress,
          neighborhood: data.bairro || prev.neighborhood,
          number: addressChanged ? "" : prev.number,
        };
      });
    } catch {
      setErrors((prev) => ({ ...prev, cep: "Erro ao buscar CEP. Verifique sua conexão." }));
    } finally {
      setCepLoading(false);
    }
  };

  const handlePhoneBlur = async () => {
    const digits = details.phone.replace(/\D/g, "");
    if (digits.length < 10) return;

    try {
      const res = await fetch(`/api/customers/lookup?phone=${digits}`);
      const { customer } = await res.json();
      if (customer) {
        setDetails((prev) => ({
          ...prev,
          name: customer.name || prev.name,
          cep: customer.cep || prev.cep,
          address: customer.address || prev.address,
          number: customer.number || prev.number,
          neighborhood: customer.neighborhood || prev.neighborhood,
          complement: customer.complement || prev.complement,
          reference: customer.reference || prev.reference,
        }));
        setWelcome(`Bem-vindo de volta, ${customer.name.split(" ")[0]}! Seus dados foram preenchidos.`);
      }
    } catch {
      // silently ignore lookup errors
    }
  };

  const validate = (): boolean => {
    const next: Errors = {};
    if (details.phone.replace(/\D/g, "").length < 10) next.phone = "Informe um telefone válido";
    if (!details.name.trim()) next.name = "Informe seu nome";
    if (!details.cep.replace(/\D/g, "")) next.cep = "Informe o CEP";
    if (!details.address.trim()) next.address = "Informe a rua";
    if (!details.number.trim()) next.number = "Informe o número";
    if (!details.neighborhood.trim()) next.neighborhood = "Informe o bairro";
    else if (lookupFrete(details.neighborhood) == null)
      next.neighborhood = "Bairro fora da área de entrega";
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    if (deliveryFee == null) return;
    onSubmit(details, deliveryFee);
  };

  const inputClass = (err?: string) =>
    `${inputBase} ${err ? "border-red-400" : "border-border"}`;

  return (
    <form onSubmit={handleSubmit} className="flex h-full flex-col">
      <div className="flex items-center gap-3 border-b border-border px-5 py-4">
        <button type="button" onClick={onBack} className="rounded-full border border-border p-2 text-muted transition hover:border-foreground hover:text-foreground" aria-label="Voltar ao carrinho">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-4 w-4">
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 6l-6 6 6 6" />
          </svg>
        </button>
        <h2 className="font-display text-xl font-semibold text-foreground">Finalizar pedido</h2>
      </div>

      <div className="flex-1 space-y-4 overflow-y-auto px-5 py-5">
        {/* Telefone primeiro */}
        <div>
          <label className={labelClass}>Telefone / WhatsApp</label>
          <input
            type="tel"
            inputMode="numeric"
            value={details.phone}
            onChange={(e) => update("phone", formatPhone(e.target.value))}
            onBlur={handlePhoneBlur}
            placeholder="(83) 99999-9999"
            className={inputClass(errors.phone)}
            autoComplete="tel"
          />
          {errors.phone && <p className="mt-1 text-xs text-red-500">{errors.phone}</p>}
        </div>

        {/* Mensagem de boas-vindas */}
        {welcome && (
          <div className="flex items-center gap-2 rounded-lg border border-gold-soft/30 bg-gold-soft/5 px-3 py-2.5 text-xs text-gold-soft">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-4 w-4 shrink-0">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span>{welcome}</span>
          </div>
        )}

        {/* Nome */}
        <div>
          <label className={labelClass}>Nome completo</label>
          <input
            type="text"
            value={details.name}
            onChange={(e) => update("name", e.target.value)}
            placeholder="Seu nome"
            className={inputClass(errors.name)}
            autoComplete="name"
          />
          {errors.name && <p className="mt-1 text-xs text-red-500">{errors.name}</p>}
        </div>

        {/* CEP */}
        <div>
          <label className={labelClass}>CEP</label>
          <div className="relative">
            <input
              type="text"
              inputMode="numeric"
              value={details.cep}
              onChange={(e) => update("cep", formatCep(e.target.value))}
              onBlur={handleCepBlur}
              placeholder="00000-000"
              maxLength={9}
              className={`${inputClass(errors.cep)} ${cepLoading ? "pr-9" : ""}`}
              autoComplete="postal-code"
            />
            {cepLoading && (
              <div className="absolute right-3 top-1/2 -translate-y-1/2">
                <svg className="h-4 w-4 animate-spin text-muted" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
                </svg>
              </div>
            )}
          </div>
          {errors.cep && <p className="mt-1 text-xs text-red-500">{errors.cep}</p>}
        </div>

        {/* Rua + Número */}
        <div className="grid grid-cols-3 gap-3">
          <div className="col-span-2">
            <label className={labelClass}>Rua</label>
            <input
              type="text"
              value={details.address}
              onChange={(e) => update("address", e.target.value)}
              placeholder="Nome da rua"
              className={inputClass(errors.address)}
              autoComplete="address-line1"
            />
            {errors.address && <p className="mt-1 text-xs text-red-500">{errors.address}</p>}
          </div>
          <div>
            <label className={labelClass}>Número</label>
            <input
              type="text"
              inputMode="numeric"
              value={details.number}
              onChange={(e) => update("number", e.target.value)}
              placeholder="123"
              className={inputClass(errors.number)}
            />
            {errors.number && <p className="mt-1 text-xs text-red-500">{errors.number}</p>}
          </div>
        </div>

        {/* Bairro */}
        <div>
          <label className={labelClass}>Bairro</label>
          <input
            type="text"
            value={details.neighborhood}
            onChange={(e) => update("neighborhood", e.target.value)}
            placeholder="Seu bairro"
            className={inputClass(errors.neighborhood)}
            autoComplete="address-level2"
          />
          {errors.neighborhood && <p className="mt-1 text-xs text-red-500">{errors.neighborhood}</p>}
          {!errors.neighborhood && freteNotFound && (
            <a
              href="https://wa.me/5583993228832"
              target="_blank"
              rel="noopener noreferrer"
              className="mt-1.5 flex items-center gap-1.5 rounded-lg border border-yellow-300 bg-yellow-50 px-3 py-2 text-xs text-yellow-800"
            >
              <span>⚠️ Bairro não encontrado. Entre em contato pelo WhatsApp para combinarmos a entrega.</span>
            </a>
          )}
          {!errors.neighborhood && deliveryFee != null && (
            <p className="mt-1.5 text-xs text-gold-soft">
              ✓ Entregamos no seu bairro — frete {formatPrice(deliveryFee)}
            </p>
          )}
        </div>

        {/* Complemento */}
        <div>
          <label className={labelClass}>Complemento (opcional)</label>
          <input
            type="text"
            value={details.complement}
            onChange={(e) => update("complement", e.target.value)}
            placeholder="Apto, bloco, casa..."
            className={inputClass()}
          />
        </div>

        {/* Ponto de referência */}
        <div>
          <label className={labelClass}>Ponto de referência (opcional)</label>
          <input
            type="text"
            value={details.reference}
            onChange={(e) => update("reference", e.target.value)}
            placeholder="Próximo a..."
            className={inputClass()}
          />
        </div>

        {/* Observações */}
        <div>
          <label className={labelClass}>Observações (opcional)</label>
          <textarea
            value={details.notes}
            onChange={(e) => update("notes", e.target.value)}
            placeholder="Ex.: sem cebola, troco para R$50, interfone com defeito..."
            rows={3}
            className={`${inputClass()} resize-none`}
          />
        </div>
      </div>

      <div className="border-t border-border px-5 py-4">
        <div className="mb-3 space-y-1.5 text-sm">
          <div className="flex justify-between text-muted">
            <span>Subtotal</span>
            <span>{formatPrice(totalPrice)}</span>
          </div>
          <div className="flex justify-between text-muted">
            <span>Frete</span>
            <span>
              {deliveryFee != null
                ? formatPrice(deliveryFee)
                : freteNotFound
                  ? "—"
                  : "Informe o bairro"}
            </span>
          </div>
          <div className="flex justify-between border-t border-border pt-1.5 font-semibold text-foreground">
            <span>Total</span>
            <span className="font-display text-lg">{formatPrice(orderTotal)}</span>
          </div>
        </div>
        <button
          type="submit"
          disabled={deliveryFee == null}
          className="w-full rounded-xl bg-foreground px-5 py-3.5 font-semibold text-background transition hover:bg-gold-soft disabled:cursor-not-allowed disabled:opacity-40"
        >
          Escolher pagamento →
        </button>
      </div>
    </form>
  );
}
