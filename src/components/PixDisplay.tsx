"use client";

import { useEffect, useRef, useState } from "react";

const EXPIRY_SECONDS = 30 * 60;

function pad(n: number) {
  return n.toString().padStart(2, "0");
}

export default function PixDisplay({
  qrCode,
  qrCodeBase64,
  onClose,
}: {
  qrCode: string;
  qrCodeBase64: string;
  onClose: () => void;
}) {
  const [seconds, setSeconds] = useState(EXPIRY_SECONDS);
  const [copied, setCopied] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    intervalRef.current = setInterval(() => {
      setSeconds((s) => {
        if (s <= 1) {
          clearInterval(intervalRef.current!);
          return 0;
        }
        return s - 1;
      });
    }, 1000);
    return () => clearInterval(intervalRef.current!);
  }, []);

  const minutes = Math.floor(seconds / 60);
  const secs = seconds % 60;
  const expired = seconds === 0;
  const urgency = seconds < 5 * 60;

  const handleCopy = () => {
    navigator.clipboard.writeText(qrCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="flex h-full flex-col">
      <div className="border-b border-border px-5 py-4">
        <h2 className="font-display text-xl font-semibold text-gold-soft">Pague com PIX</h2>
        <p className="text-xs text-muted">Escaneie o QR code ou copie o código</p>
      </div>

      <div className="flex flex-1 flex-col items-center justify-start gap-5 overflow-y-auto px-5 py-6">
        {expired ? (
          <div className="flex flex-col items-center gap-3 text-center">
            <span className="text-4xl">⏰</span>
            <p className="text-foreground font-semibold">PIX expirado</p>
            <p className="text-sm text-muted">O QR code venceu. Faça um novo pedido.</p>
            <button
              onClick={onClose}
              className="mt-2 rounded-xl bg-gold px-5 py-2.5 text-sm font-semibold text-background transition hover:bg-gold-soft"
            >
              Fechar
            </button>
          </div>
        ) : (
          <>
            <div className={`text-center text-2xl font-bold tabular-nums ${urgency ? "text-red-400" : "text-gold"}`}>
              ⏱ {pad(minutes)}:{pad(secs)}
            </div>

            {qrCodeBase64 && (
              <img
                src={`data:image/png;base64,${qrCodeBase64}`}
                alt="QR Code PIX"
                className="h-52 w-52 rounded-xl border border-border"
              />
            )}

            <div className="w-full">
              <p className="mb-1 text-xs font-semibold uppercase tracking-widest text-muted">
                Código PIX copia e cola
              </p>
              <div className="flex items-center gap-2 rounded-lg border border-border bg-background p-3">
                <p className="flex-1 truncate text-xs text-foreground">{qrCode}</p>
                <button
                  onClick={handleCopy}
                  className="shrink-0 rounded-full border border-border px-3 py-1 text-xs font-semibold text-muted transition hover:border-gold hover:text-gold"
                >
                  {copied ? "Copiado!" : "Copiar"}
                </button>
              </div>
            </div>

            <div className="w-full rounded-xl border border-border bg-background/50 p-4 text-sm text-muted">
              <p>🔔 O pedido entra na cozinha <strong className="text-foreground">automaticamente</strong> após a confirmação do pagamento.</p>
              <p className="mt-1">📱 Abra o app do seu banco e escaneie o QR code ou cole o código PIX.</p>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
