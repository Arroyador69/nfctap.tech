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
/**
 * Hasta esta hora se permite catch-up si el día va por debajo del ritmo
 * (cola vacía a mediodía no debe dejar el día en 150/500).
 */
export const WAVE_CATCHUP_HOUR_END = 20;

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

/** true si estamos en ventana normal o en catch-up con mails pendientes del ritmo. */
export function canSendThisHour(opts: {
  hour: number;
  daySent: number;
  force?: boolean;
}) {
  if (opts.force) return { ok: true as const, mode: "force" as const };
  if (opts.hour >= WAVE_HOUR_START && opts.hour <= WAVE_HOUR_END) {
    return { ok: true as const, mode: "window" as const };
  }
  const behind = Math.max(0, expectedSentByNow(WAVE_HOUR_END) - opts.daySent);
  if (
    opts.hour > WAVE_HOUR_END &&
    opts.hour <= WAVE_CATCHUP_HOUR_END &&
    behind > 0 &&
    opts.daySent < NFC_LEADS_DAILY_HARD_CAP
  ) {
    return { ok: true as const, mode: "catchup" as const, behind };
  }
  return {
    ok: false as const,
    mode: "outside_window" as const,
    window: `${WAVE_HOUR_START}–${WAVE_HOUR_END} (+catch-up→${WAVE_CATCHUP_HOUR_END})`,
  };
}

export function waveScheduleSummary() {
  return {
    waveMax: NFC_LEADS_WAVE_MAX,
    wavesPerDay: NFC_LEADS_WAVES_PER_DAY,
    dailyHardCap: NFC_LEADS_DAILY_HARD_CAP,
    windowMadrid: "08:00–17:00 (+catch-up hasta 20:00 si vamos tarde)",
    mixNote:
      "Preferencia ~350 cold + ~150 FU · hard 500 · orden click→open→cold→silencio",
    telegramDay: "12:00 progreso · 16:00 progreso · 21:00 cierre (3/día)",
    salesGoalNote: "Con ≥10 ventas /negocio → STOP oleadas ese día",
    dashboardNote:
      "Cron: intención primero, luego cold, silencio solo para llenar. Backfill: ?backfillFollowUp=1&force=1",
    bufferNote:
      "Harvest/extract desde ~05:00 Madrid · cola mín 800 / objetivo 1200 · refill en cada oleada si baja",
  };
}
