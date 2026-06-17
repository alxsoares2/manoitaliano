"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { OrderRecord } from "@/types/database";
import { TRACKING_STEPS, PAYMENT_METHOD_LABELS } from "@/lib/orderStatus";
import { formatPrice } from "@/lib/format";

export default function OrderTrackingPage() {
  const params = useParams();
  const id = params.id as string;

  const [order, setOrder] = useState<OrderRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    let active = true;

    supabase
      .from("orders")
      .select("*")
      .eq("id", id)
      .maybeSingle()
      .then(({ data }) => {
        if (!active) return;
        if (data) setOrder(data as OrderRecord);
        else setNotFound(true);
        setLoading(false);
      });

    const channel = supabase
      .channel(`order-${id}`)
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "orders", filter: `id=eq.${id}` },
        (payload) => {
          setOrder(payload.new as OrderRecord);
        }
      )
      .subscribe();

    return () => {
      active = false;
      supabase.removeChannel(channel);
    };
  }, [id]);

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-background">
        <p className="text-sm text-muted">Carregando seu pedido...</p>
      </main>
    );
  }

  if (notFound || !order) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center gap-3 bg-background px-6 text-center">
        <span className="text-4xl">🔍</span>
        <h1 className="font-display text-2xl font-semibold text-foreground">Pedido não encontrado</h1>
        <p className="max-w-xs text-sm text-muted">Verifique o link recebido ou entre em contato pelo (83) 99322-8832.</p>
        <a href="/" className="mt-2 rounded-xl bg-foreground px-6 py-2.5 text-sm font-semibold text-background transition hover:bg-gold-soft">
          Ir ao cardápio
        </a>
      </main>
    );
  }

  const orderNumber = order.id.slice(0, 8).toUpperCase();
  const isCancelled = order.status === "cancelado";
  const isPending = order.status === "pendente";
  const currentIndex = TRACKING_STEPS.findIndex((s) => s.status === order.status);

  return (
    <main className="min-h-screen bg-background pb-16">
      {/* Header */}
      <header className="border-b border-border bg-white">
        <div className="mx-auto flex max-w-lg items-center justify-between px-5 py-4">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo.png" alt="Basílico Pizzas" className="h-10 w-auto object-contain" />
          <span className="text-xs font-semibold uppercase tracking-widest text-muted">
            Pedido #{orderNumber}
          </span>
        </div>
      </header>

      <div className="mx-auto max-w-lg px-5">
        {/* Título */}
        <section className="py-8 text-center">
          <h1 className="font-display text-2xl font-semibold text-foreground">
            Olá, {order.customer_name.split(" ")[0]}!
          </h1>
          <p className="mt-1 text-sm text-muted">
            {isCancelled
              ? "Seu pedido foi cancelado."
              : isPending
                ? "Aguardando confirmação do pagamento."
                : "Acompanhe seu pedido em tempo real."}
          </p>
        </section>

        {/* Status cancelado */}
        {isCancelled ? (
          <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-center">
            <span className="text-3xl">❌</span>
            <p className="mt-2 font-semibold text-red-700">Pedido cancelado</p>
            <p className="mt-1 text-sm text-red-600">
              Em caso de dúvidas, fale conosco pelo (83) 99322-8832.
            </p>
          </div>
        ) : (
          /* Linha do tempo */
          <div className="rounded-2xl border border-border bg-white p-6 shadow-sm">
            <ol className="relative space-y-7">
              {TRACKING_STEPS.map((step, i) => {
                const done = !isPending && i < currentIndex;
                const active = !isPending && i === currentIndex;
                const pending = isPending || i > currentIndex;

                return (
                  <li key={step.status} className="relative flex items-center gap-4">
                    {/* Linha conectora */}
                    {i < TRACKING_STEPS.length - 1 && (
                      <span
                        className={`absolute left-5 top-10 h-7 w-0.5 -translate-x-1/2 ${
                          done ? "bg-gold-soft" : "bg-border"
                        }`}
                      />
                    )}
                    {/* Ícone */}
                    <span
                      className={`z-10 flex h-10 w-10 shrink-0 items-center justify-center rounded-full border-2 text-lg transition ${
                        active
                          ? "border-gold-soft bg-gold-soft/10"
                          : done
                            ? "border-gold-soft bg-gold-soft text-white"
                            : "border-border bg-background"
                      }`}
                    >
                      {done ? "✓" : step.icon}
                    </span>
                    {/* Texto */}
                    <div className="flex-1">
                      <p
                        className={`font-medium ${
                          active ? "text-foreground" : done ? "text-foreground" : "text-muted"
                        }`}
                      >
                        {step.label}
                      </p>
                      {active && (
                        <p className="text-xs font-semibold uppercase tracking-widest text-gold-soft">
                          Em andamento
                        </p>
                      )}
                    </div>
                    {pending && !active && (
                      <span className="text-xs text-muted">Aguardando</span>
                    )}
                  </li>
                );
              })}
            </ol>
          </div>
        )}

        {/* Detalhes do pedido */}
        <section className="mt-6 rounded-2xl border border-border bg-white p-6 shadow-sm">
          <h2 className="mb-4 font-display text-lg font-semibold text-foreground">Seu pedido</h2>
          <ul className="space-y-3">
            {order.items.map((item, idx) => (
              <li key={idx} className="flex justify-between gap-3 text-sm">
                <span className="text-foreground">
                  {item.qty}× {item.name}
                  {item.size ? ` (${item.size})` : ""}
                  {item.borda ? <span className="block text-xs text-muted">Borda: {item.borda}</span> : null}
                  {item.option ? <span className="block text-xs text-muted">{item.option}</span> : null}
                </span>
                <span className="shrink-0 text-muted">
                  {formatPrice((item.unitPrice + (item.bordaPrice ?? 0)) * item.qty)}
                </span>
              </li>
            ))}
          </ul>

          <div className="mt-4 space-y-1.5 border-t border-border pt-4 text-sm">
            {order.discount != null && order.discount > 0 && (
              <>
                <div className="flex justify-between text-muted">
                  <span>Subtotal</span>
                  <span>{formatPrice(Number(order.subtotal ?? order.total))}</span>
                </div>
                <div className="flex justify-between text-gold-soft">
                  <span>Desconto{order.coupon_code ? ` (${order.coupon_code})` : ""}</span>
                  <span>−{formatPrice(Number(order.discount))}</span>
                </div>
              </>
            )}
            <div className="flex justify-between font-semibold text-foreground">
              <span>Total</span>
              <span>{formatPrice(Number(order.total))}</span>
            </div>
            {order.payment_method && (
              <div className="flex justify-between text-muted">
                <span>Pagamento</span>
                <span>{PAYMENT_METHOD_LABELS[order.payment_method] ?? order.payment_method}</span>
              </div>
            )}
          </div>

          <div className="mt-4 border-t border-border pt-4 text-sm text-muted">
            <p className="text-xs font-semibold uppercase tracking-widest text-muted">Entrega</p>
            <p className="mt-1 text-foreground">
              {order.address}, {order.address_number} — {order.neighborhood}
            </p>
            {order.complement && <p>{order.complement}</p>}
            {order.reference && <p className="text-xs">Ref.: {order.reference}</p>}
          </div>
        </section>

        <p className="mt-6 text-center text-xs text-muted">
          Esta página atualiza automaticamente. Dúvidas? (83) 99322-8832
        </p>
      </div>
    </main>
  );
}
