import { NextResponse } from "next/server";
import { handleIncomingMessage } from "@/lib/chatbot";
import { sendGroupAlert } from "@/lib/alertGroup";

const BOT_PHONE = process.env.ZAPI_BOT_PHONE ?? "5583993228832";

// Deduplicação: guarda messageIds processados nos últimos 60s
const processed = new Map<string, number>();
const DEDUP_TTL = 60_000;

function cleanProcessed() {
  const now = Date.now();
  for (const [k, t] of processed) {
    if (now - t > DEDUP_TTL) processed.delete(k);
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();

    // Z-API envia vários tipos de callback — só processar mensagens recebidas
    // fromMe: true = enviada pelo bot; ignorar
    if (body.fromMe === true) return NextResponse.json({ ok: true });

    // Só processar texto recebido
    const text = body.text?.message;
    const phone = body.phone;
    if (!phone || !text) return NextResponse.json({ ok: true });

    // Ignorar grupos
    if (body.isGroup || phone.includes("@g.us")) return NextResponse.json({ ok: true });

    const senderDigits = phone.replace(/\D/g, "");

    // Ignorar mensagens do próprio número do bot
    const botDigits = BOT_PHONE.replace(/\D/g, "");
    if (senderDigits === botDigits || senderDigits === botDigits.replace(/^55/, ""))
      return NextResponse.json({ ok: true });

    // Deduplicação por messageId
    const msgId = body.messageId ?? body.id?.id ?? `${senderDigits}-${text.slice(0, 50)}`;
    cleanProcessed();
    if (processed.has(msgId)) return NextResponse.json({ ok: true });
    processed.set(msgId, Date.now());

    try {
      await handleIncomingMessage(senderDigits, text);
    } catch (err) {
      console.error("[webhook] handleIncomingMessage error:", err);
      sendGroupAlert(
        String(err instanceof Error ? err.message : err),
        "/api/whatsapp/webhook",
        "Verificar logs do Vercel e reiniciar se necessário"
      ).catch(() => {});
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[webhook] Error:", err);
    sendGroupAlert(
      String(err instanceof Error ? err.message : err),
      "/api/whatsapp/webhook (parse)",
      "Verificar formato do payload da Z-API"
    ).catch(() => {});
    return NextResponse.json({ ok: true });
  }
}

export async function GET() {
  return NextResponse.json({ status: "active" });
}
