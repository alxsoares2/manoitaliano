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

  return (
    <div className="bg-foreground px-4 py-3 text-center text-sm text-background">
      <span className="font-semibold">Estamos fechados no momento.</span>
      {next_open && (
        <span className="ml-1 opacity-80">
          {manually_closed ? "Voltamos em breve." : `Abrimos ${next_open}.`}
        </span>
      )}
      {manually_closed && !next_open && <span className="ml-1 opacity-80">Voltamos em breve.</span>}
    </div>
  );
}
