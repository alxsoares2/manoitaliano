"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { AdminAuthProvider, useAdminAuth } from "@/context/AdminAuthContext";

function Guard({ children }: { children: React.ReactNode }) {
  const { user } = useAdminAuth();
  const router = useRouter();

  useEffect(() => {
    if (user === null) router.replace("/admin/login");
  }, [user, router]);

  if (user === undefined) {
    return (
      <div className="flex min-h-screen items-center justify-center text-muted">
        Carregando...
      </div>
    );
  }

  if (!user) return null;

  return <>{children}</>;
}

export default function AdminAuthGuard({ children }: { children: React.ReactNode }) {
  return (
    <AdminAuthProvider>
      <Guard>{children}</Guard>
    </AdminAuthProvider>
  );
}
