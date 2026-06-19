"use client";

import { FormEvent, useEffect, useRef, useState, use } from "react";
import Script from "next/script";
import { supabase } from "@/lib/supabase";
import { formatPrice } from "@/lib/format";

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

type Order = {
  id: string;
  customer_name: string;
  total: number;
  status: string;
  items: { name: string; qty: number; unitPrice: number; size?: string }[];
};

const inputClass =
  "w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm text-foreground placeholder:text-muted/50 outline-none transition focus:border-foreground";
const labelClass = "mb-1 block text-xs font-semibold uppercase tracking-widest text-muted";

export default function PagamentoPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [paid, setPaid] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [sdkReady, setSdkReady] = useState(false);
  const mpRef = useRef<MP | null>(null);

  const [card, setCard] = useState({
    cardNumber: "", cardHolder: "", expiryMonth: "", expiryYear: "", cvv: "", cpf: "",
  });

  useEffect(() => {
    supabase
      .from("orders")
      .select("id, customer_name, total, status, items")
      .eq("id", id)
      .single()
      .then(({ data }) => {
        if (data) {
          setOrder(data as Order);
          if (data.status !== "pendente") setPaid(true);
        }
        setLoading(false);
      });
  }, [id]);

  useEffect(() => {
    if (sdkReady && window.MercadoPago && !mpRef.current) {
      mpRef.current = new window.MercadoPago(process.env.NEXT_PUBLIC_MP_PUBLIC_KEY!, { locale: "pt-BR" });
    }
  }, [sdkReady]);

  const update = (field: string, value: string) =>
    setCard((prev) => ({ ...prev, [field]: value }));

  const formatCardNumber = (v: string) =>
    v.replace(/\D/g, "").slice(0, 16).replace(/(\d{4})/g, "$1 ").trim();

  const formatCpf = (v: string) => {
    const d = v.replace(/\D/g, "").slice(0, 11);
    return d.replace(/(\d{3})(\d)/, "$1.$2").replace(/(\d{3})(\d)/, "$1.$2").replace(/(\d{3})(\d{1,2})$/, "$1-$2");
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!mpRef.current || !order) return;

    const rawNumber = card.cardNumber.replace(/\s/g, "");
    if (rawNumber.length < 13) return setError("Número do cartão inválido.");
    if (!card.expiryMonth || !card.expiryYear) return setError("Informe a validade.");
    if (card.cvv.length < 3) return setError("CVV inválido.");
    if (card.cpf.replace(/\D/g, "").length !== 11) return setError("CPF inválido.");

    setSubmitting(true);
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

      const res = await fetch("/api/payment/pay-order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          orderId: order.id,
          cardToken: token.id,
          paymentMethodId: token.payment_method_id,
          issuer: token.issuer_id,
          cpf: card.cpf,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Erro ao processar pagamento.");
      setPaid(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao processar cartão.");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <p className="text-muted">Carregando...</p>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <p className="text-muted">Pedido não encontrado.</p>
      </div>
    );
  }

  if (paid) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-background px-4 text-center">
        <div className="rounded-full bg-green-500/10 p-4">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-12 w-12 text-green-600">
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        <h1 className="text-2xl font-bold text-foreground">Pagamento aprovado!</h1>
        <p className="text-muted">Seu pedido foi confirmado e está sendo preparado.</p>
        <a href={`/pedido/${id}`} className="mt-2 rounded-xl bg-foreground px-6 py-3 font-semibold text-background transition hover:bg-gold-soft">
          Acompanhar pedido
        </a>
      </div>
    );
  }

  return (
    <>
      <Script src="https://sdk.mercadopago.com/js/v2" strategy="lazyOnload" onReady={() => setSdkReady(true)} />

      <div className="mx-auto flex min-h-screen max-w-md flex-col bg-background px-4 py-8">
        <div className="mb-6 text-center">
          <h1 className="text-xl font-bold text-foreground">Pagamento com Cartão</h1>
          <p className="mt-1 text-sm text-muted">Pedido para {order.customer_name}</p>
        </div>

        <div className="mb-6 rounded-xl border border-border bg-background-elevated p-4">
          <h2 className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted">Resumo</h2>
          {order.items.map((item, i) => (
            <div key={i} className="flex justify-between text-sm text-foreground">
              <span>{item.qty}x {item.name}{item.size ? ` (${item.size})` : ""}</span>
              <span>{formatPrice(item.unitPrice * item.qty)}</span>
            </div>
          ))}
          <div className="mt-2 flex justify-between border-t border-border pt-2 font-semibold text-foreground">
            <span>Total</span>
            <span>{formatPrice(order.total)}</span>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label className={labelClass}>Número do cartão</label>
            <input type="text" inputMode="numeric" value={card.cardNumber} onChange={(e) => update("cardNumber", formatCardNumber(e.target.value))} placeholder="0000 0000 0000 0000" maxLength={19} className={inputClass} />
          </div>
          <div>
            <label className={labelClass}>Nome no cartão</label>
            <input type="text" value={card.cardHolder} onChange={(e) => update("cardHolder", e.target.value.toUpperCase())} placeholder="NOME COMO NO CARTÃO" className={inputClass} />
          </div>
          <div className="grid grid-cols-3 gap-2">
            <div>
              <label className={labelClass}>Mês</label>
              <input type="text" inputMode="numeric" value={card.expiryMonth} onChange={(e) => update("expiryMonth", e.target.value.replace(/\D/g, "").slice(0, 2))} placeholder="MM" maxLength={2} className={inputClass} />
            </div>
            <div>
              <label className={labelClass}>Ano</label>
              <input type="text" inputMode="numeric" value={card.expiryYear} onChange={(e) => update("expiryYear", e.target.value.replace(/\D/g, "").slice(0, 2))} placeholder="AA" maxLength={2} className={inputClass} />
            </div>
            <div>
              <label className={labelClass}>CVV</label>
              <input type="text" inputMode="numeric" value={card.cvv} onChange={(e) => update("cvv", e.target.value.replace(/\D/g, "").slice(0, 4))} placeholder="123" maxLength={4} className={inputClass} />
            </div>
          </div>
          <div>
            <label className={labelClass}>CPF do titular</label>
            <input type="text" inputMode="numeric" value={card.cpf} onChange={(e) => update("cpf", formatCpf(e.target.value))} placeholder="000.000.000-00" maxLength={14} className={inputClass} />
          </div>

          {error && <p className="text-sm text-red-500">{error}</p>}

          <button
            type="submit"
            disabled={submitting || !sdkReady}
            className="w-full rounded-xl bg-foreground px-5 py-3.5 font-semibold text-background transition hover:bg-gold-soft disabled:cursor-not-allowed disabled:opacity-60"
          >
            {submitting ? "Processando..." : `Pagar ${formatPrice(order.total)}`}
          </button>
        </form>

        {/* Footer de segurança */}
        <div className="mt-8 flex flex-col items-center gap-2 text-center">
          <div className="flex items-center gap-1.5 text-muted">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-4 w-4">
              <rect x="3" y="11" width="18" height="11" rx="2" ry="2" /><path d="M7 11V7a5 5 0 0110 0v4" />
            </svg>
            <span className="text-xs font-semibold uppercase tracking-wider">Ambiente 100% seguro</span>
          </div>
          <p className="text-[11px] text-muted/70">Pagamento processado pelo Mercado Pago</p>
        </div>
      </div>
    </>
  );
}
