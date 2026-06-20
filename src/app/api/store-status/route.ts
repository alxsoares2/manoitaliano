import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

const DAY_NAMES = ["Domingo", "Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado"];

function timeToMinutes(t: string): number {
  const [h, m] = t.split(":").map(Number);
  return h * 60 + m;
}

function nextOpenText(hours: { day_of_week: number; open_time: string; active: boolean }[], nowDay: number, nowMinutes: number): string {
  // Procura próximo dia ativo (até 7 dias à frente)
  for (let delta = 0; delta <= 7; delta++) {
    const day = (nowDay + delta) % 7;
    const h = hours.find((x) => x.day_of_week === day && x.active);
    if (!h) continue;
    const openMin = timeToMinutes(h.open_time);
    if (delta === 0 && nowMinutes >= openMin) continue; // já passou hoje
    const label = delta === 0 ? "hoje" : delta === 1 ? "amanhã" : DAY_NAMES[day];
    const [hh, mm] = h.open_time.split(":");
    return `${label} às ${hh}h${mm !== "00" ? mm : ""}`;
  }
  return "em breve";
}

export async function GET() {
  // Horário de Brasília (UTC-3)
  const now = new Date(new Date().toLocaleString("en-US", { timeZone: "America/Recife" }));
  const nowDay = now.getDay();
  const nowMinutes = now.getHours() * 60 + now.getMinutes();

  const [{ data: hours }, { data: settings }] = await Promise.all([
    supabase.from("business_hours").select("day_of_week, open_time, close_time, active").order("day_of_week"),
    supabase.from("store_settings").select("key, value"),
  ]);

  const manuallyClosed = settings?.find((s) => s.key === "manually_closed")?.value === "true";
  const waitActive = settings?.find((s) => s.key === "wait_time_active")?.value === "true";
  const waitMin = settings?.find((s) => s.key === "wait_time_min")?.value ?? null;
  const waitMax = settings?.find((s) => s.key === "wait_time_max")?.value ?? null;
  const waitTime = waitActive && waitMin && waitMax ? { min: Number(waitMin), max: Number(waitMax) } : null;

  if (manuallyClosed) {
    return NextResponse.json({ open: false, manually_closed: true, next_open: null, wait_time: null });
  }

  const todayHours = hours?.find((h) => h.day_of_week === nowDay && h.active);
  let isOpen = false;

  if (todayHours) {
    const openMin = timeToMinutes(todayHours.open_time);
    const closeMin = timeToMinutes(todayHours.close_time);
    isOpen = nowMinutes >= openMin && nowMinutes < closeMin;
  }

  const nextOpen = isOpen ? null : nextOpenText(hours ?? [], nowDay, nowMinutes);

  return NextResponse.json({ open: isOpen, manually_closed: false, next_open: nextOpen, wait_time: waitTime });
}
