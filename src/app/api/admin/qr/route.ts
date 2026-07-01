import { NextResponse } from "next/server";
import QRCode from "qrcode";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const url = searchParams.get("url") ?? "https://manoitaliano.com.br";

  const dataUrl = await QRCode.toDataURL(url, {
    width: 200,
    margin: 1,
    color: { dark: "#000000", light: "#ffffff" },
  });

  return NextResponse.json({ dataUrl });
}
