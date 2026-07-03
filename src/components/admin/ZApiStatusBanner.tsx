"use client";

import { useEffect, useState, useCallback } from "react";

type ZApiStatus = {
  configured: boolean;
  connected: boolean;
  phoneConnected?: boolean | null;
  reason?: string;
};

const CHECK_INTERVAL_MS = 5 * 60 * 1000; // verifica a cada 5 minutos

export default function ZApiStatusBanner() {
  const [status, setStatus] = useState<ZApiStatus | null>(null);
  const [checking, setChecking] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  const check = useCallback(async () => {
    setChecking(true);
    try {
      const res = await fetch("/api/admin/zapi-status");
      if (res.ok) {
        const data = await res.json();
        setStatus(data);
        // Se reconectou, reexibe o banner na próxima desconexão
        if (data.connected) setDismissed(false);
      }
    } catch {
      // silencia — não é crítico mostrar o erro do check
    } finally {
      setChecking(false);
    }
  }, []);

  useEffect(() => {
    check();
    const interval = setInterval(check, CHECK_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [check]);

  // Não está configurada no env → não exibe nada
  if (!status || !status.configured) return null;

  // Tudo OK → não exibe banner
  if (status.connected) return null;

  // Descartado manualmente pelo usuário (até o próximo check)
  if (dismissed) return null;

  const reasonLabel: Record<string, string> = {
    env_missing:  "Credenciais Z-API não configuradas nas env vars",
    timeout:      "Timeout ao conectar à Z-API",
    http_401:     "Token Z-API inválido",
    http_403:     "Client-Token Z-API inválido",
    http_404:     "Instância Z-API não encontrada",
  };

  const detail = status.reason ? (reasonLabel[status.reason] ?? status.reason) : "WhatsApp desconectado";

  return (
    <div className="sticky top-0 z-50 flex items-center justify-between gap-3 bg-red-600 px-4 py-2.5 text-white shadow-lg">
      <div className="flex items-center gap-3">
        <span className="text-lg" aria-hidden>📵</span>
        <div>
          <p className="text-sm font-semibold leading-tight">
            Z-API desconectada — notificações WhatsApp fora do ar
          </p>
          <p className="text-xs text-red-100">{detail} · Reconecte o WhatsApp no painel da Z-API</p>
        </div>
      </div>
      <div className="flex shrink-0 items-center gap-2">
        <button
          onClick={check}
          disabled={checking}
          className="rounded-full border border-white/30 px-3 py-1 text-xs font-semibold text-white transition hover:bg-white/10 disabled:opacity-50"
        >
          {checking ? "Verificando..." : "Verificar agora"}
        </button>
        <a
          href="https://app.z-api.io"
          target="_blank"
          rel="noopener noreferrer"
          className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-red-600 transition hover:bg-red-50"
        >
          Abrir Z-API →
        </a>
        <button
          onClick={() => setDismissed(true)}
          className="rounded-full p-1 text-white/70 transition hover:text-white"
          aria-label="Fechar alerta"
        >
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="h-4 w-4">
            <path strokeLinecap="round" d="M6 6l12 12M18 6 6 18" />
          </svg>
        </button>
      </div>
    </div>
  );
}
