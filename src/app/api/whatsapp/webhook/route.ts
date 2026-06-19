import { NextResponse } from "next/server";
import { handleIncomingMessage } from "@/lib/chatbot";

const ZAPI_CLIENT_TOKEN = process.env.ZAPI_CLIENT_TOKEN;
const BOT_PHONE = process.env.ZAPI_BOT_PHONE ?? "5583993228832";

export async function POST(request: Request) {
  try {
    const body = await request.json();

    // Z-API não envia Client-Token como header nos webhooks de recebimento.
    // A segurança vem pelo URL secreto + validação do payload.

    // Z-API envia diferentes tipos de eventos — só processar mensagens de texto recebidas
    const isMessage = body.type === "ReceivedCallback" || body.text?.message;
    if (!isMessage) {
      return NextResponse.json({ ok: true });
    }

    const phone = body.phone ?? body.from;
    const text = body.text?.message ?? body.body ?? body.message;

    if (!phone || !text) {
      return NextResponse.json({ ok: true });
    }

    // Ignora mensagens enviadas pelo próprio bot
    const senderDigits = phone.replace(/\D/g, "");
    if (senderDigits === BOT_PHONE || senderDigits === BOT_PHONE.replace(/^55/, "")) {
      return NextResponse.json({ ok: true });
    }

    // Ignora mensagens de grupo
    if (body.isGroup || body.isGroupMsg || phone.includes("@g.us")) {
      return NextResponse.json({ ok: true });
    }

    // Processa em background para responder rápido ao webhook
    handleIncomingMessage(senderDigits, text).catch((err) =>
      console.error("[webhook] handleIncomingMessage error:", err)
    );

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[webhook] Error:", err);
    return NextResponse.json({ ok: true });
  }
}

// Z-API faz GET para verificar se o webhook está ativo
export async function GET() {
  return NextResponse.json({ status: "active" });
}
