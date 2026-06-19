"use client";

import { createContext, useContext, useEffect, useState } from "react";

type StoreStatus = {
  open: boolean;
  manually_closed: boolean;
  next_open: string | null;
  loading: boolean;
};

const StoreStatusContext = createContext<StoreStatus>({
  open: true,
  manually_closed: false,
  next_open: null,
  loading: true,
});

export function StoreStatusProvider({ children }: { children: React.ReactNode }) {
  const [status, setStatus] = useState<StoreStatus>({ open: true, manually_closed: false, next_open: null, loading: true });

  useEffect(() => {
    fetch("/api/store-status")
      .then((r) => r.json())
      .then((data) => setStatus({ ...data, loading: false }))
      .catch(() => setStatus((s) => ({ ...s, loading: false })));

    // Re-verifica a cada 5 minutos
    const interval = setInterval(() => {
      fetch("/api/store-status")
        .then((r) => r.json())
        .then((data) => setStatus({ ...data, loading: false }))
        .catch(() => {});
    }, 5 * 60 * 1000);

    return () => clearInterval(interval);
  }, []);

  return <StoreStatusContext.Provider value={status}>{children}</StoreStatusContext.Provider>;
}

export function useStoreStatus() {
  return useContext(StoreStatusContext);
}
