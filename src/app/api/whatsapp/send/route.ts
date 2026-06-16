import { NextResponse } from "next/server";
import { formatPhoneForWhatsapp } from "@/lib/whatsapp";

export async function POST(request: Request) {
  const { phone, message } = await request.json();

  if (!phone || !message) {
    return NextResponse.json(
      { error: "Os campos 'phone' e 'message' são obrigatórios." },
      { status: 400 }
    );
  }

  const instanceId = process.env.ZAPI_INSTANCE_ID;
  const token = process.env.ZAPI_TOKEN;

  if (!instanceId || !token) {
    return NextResponse.json(
      { error: "Credenciais da Z-API não configuradas." },
      { status: 500 }
    );
  }

  const url = `https://api.z-api.io/instances/${instanceId}/token/${token}/send-text`;

  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      phone: formatPhoneForWhatsapp(phone),
      message,
    }),
  });

  const data = await response.json();

  if (!response.ok) {
    return NextResponse.json(
      { error: "Falha ao enviar mensagem via Z-API.", details: data },
      { status: response.status }
    );
  }

  return NextResponse.json({ success: true, data });
}
