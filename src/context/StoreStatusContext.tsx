"use client";

import { createContext, useContext, useEffect, useState } from "react";

type WaitTime = { min: number; max: number } | null;

type StoreStatus = {
  open: boolean;
  manually_closed: boolean;
  next_open: string | null;
  wait_time: WaitTime;
  loading: boolean;
};

const StoreStatusContext = createContext<StoreStatus>({
  open: true,
  manually_closed: false,
  next_open: null,
  wait_time: null,
  loading: true,
});

export function StoreStatusProvider({ children }: { children: React.ReactNode }) {
  const [status, setStatus] = useState<StoreStatus>({ open: true, manually_closed: false, next_open: null, wait_time: null, loading: true });

  useEffect(() => {
    const doFetch = () =>
      fetch("/api/store-status")
        .then((r) => r.json())
        .then((data) => setStatus({ ...data, loading: false }))
        .catch(() => {});

    doFetch();
    const interval = setInterval(doFetch, 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  return <StoreStatusContext.Provider value={status}>{children}</StoreStatusContext.Provider>;
}

export function useStoreStatus() {
  return useContext(StoreStatusContext);
}
