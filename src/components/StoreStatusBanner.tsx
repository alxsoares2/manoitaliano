"use client";

import { useStoreStatus } from "@/context/StoreStatusContext";

export default function StoreStatusBanner() {
  const { open, manually_closed, next_open, loading } = useStoreStatus();

  if (loading) return null;

  if (open) {
    return (
      <div className="flex justify-center py-2">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-green-500/10 px-3 py-1 text-xs font-medium text-green-700">
          <span className="h-1.5 w-1.5 rounded-full bg-green-500 animate-pulse" />
          Aberto agora
        </span>
      </div>
    );
  }

  const message = manually_closed
    ? "Estamos fechados no momento. Voltamos em breve."
    : next_open
    ? `Estamos fechados no momento. Abrimos ${next_open}.`
    : "Estamos fechados no momento.";

  return (
    <div
      style={{ background: "#DC2626" }}
      className="w-full px-4 py-4 text-center"
    >
      <p className="text-base font-bold text-white sm:text-lg">
        🔒 {message}
      </p>
    </div>
  );
}
