/**
 * Oleadas NFCTap + 3 Telegram/día (como Delfín):
 * progreso mañana · progreso tarde · cierre noche.
 *
 * Ventana envío: 08:00–17:00 Madrid · 10 oleadas × 50 = 500/día.
 */

import { NFC_LEADS_DAILY_HARD_CAP, NFC_LEADS_WAVES_PER_DAY, NFC_LEADS_WAVE_MAX } from "./constants";

/** Primera hora Madrid con oleada (inclusive). */
export const WAVE_HOUR_START = 8;
/** Última hora Madrid con oleada (inclusive) → 10 slots (8…17). */
export const WAVE_HOUR_END = 17;

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
 * Cuántas oleadas “deberían” haberse hecho ya a esta hora (catch-up).
 * A las 8:00 → 1 · a las 17:00 → 10 · fuera de ventana → 0 o 10.
 */
export function wavesDueByHour(hour = madridHourNow()) {
  if (hour < WAVE_HOUR_START) return 0;
  if (hour > WAVE_HOUR_END) return NFC_LEADS_WAVES_PER_DAY;
  return Math.min(NFC_LEADS_WAVES_PER_DAY, hour - WAVE_HOUR_START + 1);
}

/** Mails que deberían ir enviados ya (anti-burst: no más del ritmo horario). */
export function expectedSentByNow(hour = madridHourNow()) {
  return Math.min(NFC_LEADS_DAILY_HARD_CAP, wavesDueByHour(hour) * NFC_LEADS_WAVE_MAX);
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
    windowMadrid: "08:00–17:00 (cron horario · 10×50)",
    telegramDay: "12:00 progreso · 16:00 progreso · 21:00 cierre (3/día)",
    salesGoalNote: "Con ≥10 ventas /negocio → STOP oleadas ese día",
    dashboardNote: "No hace falta tocar el dashboard: el cron rellena cola y envía solo",
  };
}
