"use client";

import { FormEvent, useEffect, useRef, useState } from "react";
import Script from "next/script";
import { CustomerDetails } from "@/types/order";

type CardData = {
  cardNumber: string;
  cardHolder: string;
  expiryMonth: string;
  expiryYear: string;
  cvv: string;
  cpf: string;
};

type MP = {
  createCardToken: (data: {
    cardNumber: string;
    cardholderName: string;
    cardExpirationMonth: string;
    cardExpirationYear: string;
    securityCode: string;
    identificationType: string;
    identificationNumber: string;
  }) => Promise<{ id: string; payment_method_id: string; issuer_id: string }>;
};

declare global {
  interface Window {
    MercadoPago: new (key: string, opts?: object) => MP;
  }
}

const inputClass =
  "w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm text-foreground placeholder:text-muted/60 outline-none transition focus:border-gold";

export default function CardForm({
  customer,
  items,
  total,
  onSuccess,
}: {
  customer: CustomerDetails;
  items: object[];
  total: number;
  onSuccess: () => void;
}) {
  const [card, setCard] = useState<CardData>({
    cardNumber: "",
    cardHolder: customer.name,
    expiryMonth: "",
    expiryYear: "",
    cvv: "",
    cpf: "",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const mpRef = useRef<MP | null>(null);
  const [sdkReady, setSdkReady] = useState(false);

  useEffect(() => {
    if (sdkReady && window.MercadoPago && !mpRef.current) {
      mpRef.current = new window.MercadoPago(
        process.env.NEXT_PUBLIC_MP_PUBLIC_KEY!,
        { locale: "pt-BR" }
      );
    }
  }, [sdkReady]);

  const update = (field: keyof CardData, value: string) =>
    setCard((prev) => ({ ...prev, [field]: value }));

  const formatCardNumber = (value: string) =>
    value.replace(/\D/g, "").slice(0, 16).replace(/(\d{4})/g, "$1 ").trim();

  const formatCpf = (value: string) => {
    const digits = value.replace(/\D/g, "").slice(0, 11);
    return digits
      .replace(/(\d{3})(\d)/, "$1.$2")
      .replace(/(\d{3})(\d)/, "$1.$2")
      .replace(/(\d{3})(\d{1,2})$/, "$1-$2");
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!mpRef.current) {
      setError("SDK do Mercado Pago não carregou. Recarregue a página.");
      return;
    }

    const rawNumber = card.cardNumber.replace(/\s/g, "");
    if (rawNumber.length < 13) { setError("Número do cartão inválido."); return; }
    if (!card.expiryMonth || !card.expiryYear) { setError("Informe a validade."); return; }
    if (card.cvv.length < 3) { setError("CVV inválido."); return; }
    if (card.cpf.replace(/\D/g, "").length !== 11) { setError("CPF inválido."); return; }

    setLoading(true);
    setError(null);

    try {
      const token = await mpRef.current.createCardToken({
        cardNumber: rawNumber,
        cardholderName: card.cardHolder,
        cardExpirationMonth: card.expiryMonth,
        cardExpirationYear: card.expiryYear,
        securityCode: card.cvv,
        identificationType: "CPF",
        identificationNumber: card.cpf.replace(/\D/g, ""),
      });

      const res = await fetch("/api/payment/create-card", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customer,
          items,
          total,
          cardToken: token.id,
          paymentMethodId: token.payment_method_id,
          issuer: token.issuer_id,
          cpf: card.cpf,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Erro ao processar pagamento.");

      onSuccess();
    } catch (err) {
      console.error("CardForm error:", JSON.stringify(err));
      // MP SDK v2 throws an array of error objects
      const firstErr = Array.isArray(err) ? err[0] : err;
      const msg =
        firstErr?.message
        ?? firstErr?.cause?.[0]?.description
        ?? (err instanceof Error ? err.message : null)
        ?? "Erro ao processar cartão. Tente novamente.";
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Script
        src="https://sdk.mercadopago.com/js/v2"
        strategy="lazyOnload"
        onReady={() => setSdkReady(true)}
      />

      <form onSubmit={handleSubmit} className="space-y-3">
        <div>
          <label className="mb-1 block text-xs font-semibold uppercase tracking-widest text-gold">
            Número do cartão
          </label>
          <input
            type="text"
            inputMode="numeric"
            value={card.cardNumber}
            onChange={(e) => update("cardNumber", formatCardNumber(e.target.value))}
            placeholder="0000 0000 0000 0000"
            maxLength={19}
            className={inputClass}
          />
        </div>

        <div>
          <label className="mb-1 block text-xs font-semibold uppercase tracking-widest text-gold">
            Nome no cartão
          </label>
          <input
            type="text"
            value={card.cardHolder}
            onChange={(e) => update("cardHolder", e.target.value.toUpperCase())}
            placeholder="NOME COMO NO CARTÃO"
            className={inputClass}
          />
        </div>

        <div className="grid grid-cols-3 gap-2">
          <div>
            <label className="mb-1 block text-xs font-semibold uppercase tracking-widest text-gold">
              Mês
            </label>
            <input
              type="text"
              inputMode="numeric"
              value={card.expiryMonth}
              onChange={(e) => update("expiryMonth", e.target.value.replace(/\D/g, "").slice(0, 2))}
              placeholder="MM"
              maxLength={2}
              className={inputClass}
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold uppercase tracking-widest text-gold">
              Ano
            </label>
            <input
              type="text"
              inputMode="numeric"
              value={card.expiryYear}
              onChange={(e) => update("expiryYear", e.target.value.replace(/\D/g, "").slice(0, 2))}
              placeholder="AA"
              maxLength={2}
              className={inputClass}
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold uppercase tracking-widest text-gold">
              CVV
            </label>
            <input
              type="text"
              inputMode="numeric"
              value={card.cvv}
              onChange={(e) => update("cvv", e.target.value.replace(/\D/g, "").slice(0, 4))}
              placeholder="123"
              maxLength={4}
              className={inputClass}
            />
          </div>
        </div>

        <div>
          <label className="mb-1 block text-xs font-semibold uppercase tracking-widest text-gold">
            CPF do titular
          </label>
          <input
            type="text"
            inputMode="numeric"
            value={card.cpf}
            onChange={(e) => update("cpf", formatCpf(e.target.value))}
            placeholder="000.000.000-00"
            maxLength={14}
            className={inputClass}
          />
        </div>

        {error && <p className="text-sm text-red-400">{error}</p>}

        <button
          type="submit"
          disabled={loading || !sdkReady}
          className="w-full rounded-xl bg-gold px-5 py-3.5 font-semibold text-background transition hover:bg-gold-soft disabled:cursor-not-allowed disabled:opacity-60"
        >
          {loading ? "Processando..." : `Pagar ${new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(total)}`}
        </button>
      </form>
    </>
  );
}
