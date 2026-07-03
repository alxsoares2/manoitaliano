import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/adminAuth";

export async function GET() {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

  const instanceId = process.env.ZAPI_INSTANCE_ID;
  const token = process.env.ZAPI_TOKEN;
  const clientToken = process.env.ZAPI_CLIENT_TOKEN;

  if (!instanceId || !token) {
    return NextResponse.json({ configured: false, connected: false, reason: "env_missing" });
  }

  try {
    const url = `https://api.z-api.io/instances/${instanceId}/token/${token}/status`;
    const headers: Record<string, string> = {};
    if (clientToken) headers["Client-Token"] = clientToken;

    const res = await fetch(url, { headers, signal: AbortSignal.timeout(8000) });

    if (!res.ok) {
      return NextResponse.json({ configured: true, connected: false, reason: `http_${res.status}` });
    }

    const data = await res.json();
    // Z-API retorna { connected: true/false, smartphoneConnected: true/false, ... }
    const connected = data?.connected === true;
    const phoneConnected = data?.smartphoneConnected ?? data?.phone_connected ?? null;

    return NextResponse.json({ configured: true, connected, phoneConnected, raw: data });
  } catch (err) {
    const reason = err instanceof Error ? err.message : "timeout";
    return NextResponse.json({ configured: true, connected: false, reason });
  }
}
