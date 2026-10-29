/**
 * Oleadas NFCTap + 3 Telegram/día (como Delfín):
 * progreso mañana · progreso tarde · cierre noche.
 */

import { NFC_LEADS_DAILY_HARD_CAP, NFC_LEADS_WAVES_PER_DAY, NFC_LEADS_WAVE_MAX } from "./constants";

/** Cron horario Madrid (aprox.): cada hora 8–16 = slots 0…8 */
export function madridHourNow(d = new Date()) {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Europe/Madrid",
    hour: "2-digit",
    hour12: false,
  }).formatToParts(d);
  return Number(parts.find((p) => p.type === "hour")?.value || 0);
}

export function madridDateKey(d = new Date()) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Madrid",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(d);
}

/**
 * 3 avisos Telegram al día:
 * - morning: ~12:00 (hora Madrid)
 * - afternoon: ~16:00
 * - close: ~21:00 (cierre / resumen)
 */
export type TelegramSlot = "morning" | "afternoon" | "close";

export function telegramSlotForHour(hour: number): TelegramSlot | null {
  if (hour === 12) return "morning";
  if (hour === 16) return "afternoon";
  if (hour === 21) return "close";
  return null;
}

export function waveScheduleSummary() {
  return {
    waveMax: NFC_LEADS_WAVE_MAX,
    wavesPerDay: NFC_LEADS_WAVES_PER_DAY,
    dailyHardCap: NFC_LEADS_DAILY_HARD_CAP,
    windowMadrid: "08:00–16:00 (cron horario)",
    telegramDay: "12:00 progreso · 16:00 progreso · 21:00 cierre (3/día)",
    salesGoalNote: "Con ≥10 ventas /negocio → STOP oleadas ese día",
  };
}
