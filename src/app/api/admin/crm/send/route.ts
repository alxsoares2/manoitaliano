import { NextResponse } from "next/server";
import { formatPhoneForWhatsapp } from "@/lib/whatsapp";

type Recipient = { phone: string; name: string };

function personalize(template: string, name: string, coupon: string) {
  const firstName = name.trim().split(" ")[0] || name;
  return template
    .replaceAll("{nome}", firstName)
    .replaceAll("{cupom}", coupon);
}

export async function POST(request: Request) {
  const { recipients, message, coupon } = (await request.json()) as {
    recipients: Recipient[];
    message: string;
    coupon?: string;
  };

  if (!Array.isArray(recipients) || recipients.length === 0 || !message?.trim()) {
    return NextResponse.json(
      { error: "Selecione ao menos um cliente e escreva a mensagem." },
      { status: 400 }
    );
  }

  const instanceId = process.env.ZAPI_INSTANCE_ID;
  const token = process.env.ZAPI_TOKEN;
  const clientToken = process.env.ZAPI_CLIENT_TOKEN;
  if (!instanceId || !token) {
    return NextResponse.json({ error: "Credenciais da Z-API não configuradas." }, { status: 500 });
  }

  const url = `https://api.z-api.io/instances/${instanceId}/token/${token}/send-text`;
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (clientToken) headers["Client-Token"] = clientToken;

  let sent = 0;
  let failed = 0;
  const failures: { name: string; phone: string }[] = [];

  // Envio sequencial para evitar rate limit da Z-API
  for (const r of recipients) {
    const text = personalize(message, r.name, coupon ?? "");
    try {
      const res = await fetch(url, {
        method: "POST",
        headers,
        body: JSON.stringify({ phone: formatPhoneForWhatsapp(r.phone), message: text }),
      });
      if (res.ok) {
        sent++;
      } else {
        failed++;
        failures.push({ name: r.name, phone: r.phone });
      }
    } catch {
      failed++;
      failures.push({ name: r.name, phone: r.phone });
    }
  }

  return NextResponse.json({ sent, failed, failures });
}
