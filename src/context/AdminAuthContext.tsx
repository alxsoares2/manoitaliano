"use client";

import { createContext, useContext, useEffect, useState, useCallback } from "react";
import { AdminRole } from "@/lib/adminAuth";

export type AdminUserInfo = {
  id: string;
  email: string;
  name: string;
  role: AdminRole;
};

type AdminAuthCtx = {
  user: AdminUserInfo | null | undefined; // undefined = carregando
  logout: () => Promise<void>;
  refresh: () => Promise<void>;
};

const Ctx = createContext<AdminAuthCtx>({
  user: undefined,
  logout: async () => {},
  refresh: async () => {},
});

export function AdminAuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AdminUserInfo | null | undefined>(undefined);

  const refresh = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/auth/me");
      if (res.ok) {
        const { user } = await res.json();
        setUser(user ?? null);
      } else {
        setUser(null);
      }
    } catch {
      setUser(null);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const logout = useCallback(async () => {
    await fetch("/api/admin/auth/logout", { method: "POST" });
    setUser(null);
  }, []);

  return <Ctx.Provider value={{ user, logout, refresh }}>{children}</Ctx.Provider>;
}

export function useAdminAuth() {
  return useContext(Ctx);
}
