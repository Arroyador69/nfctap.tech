/**
 * Avisos de oleadas NFCTap → Telegram (3/día como Delfín).
 * Env: TELEGRAM_BOT_TOKEN + TELEGRAM_CHAT_ID
 */

import type { TelegramSlot } from "./wave-schedule";

export async function notifyTelegram(text: string): Promise<{ ok: boolean; error?: string }> {
  const token = process.env.TELEGRAM_BOT_TOKEN?.trim();
  const chat = process.env.TELEGRAM_CHAT_ID?.trim();
  if (!token || !chat) {
    return { ok: false, error: "Falta TELEGRAM_BOT_TOKEN o TELEGRAM_CHAT_ID" };
  }
  try {
    const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: chat,
        text: text.slice(0, 4000),
        disable_web_page_preview: true,
      }),
    });
    if (!res.ok) {
      const body = await res.text();
      return { ok: false, error: body.slice(0, 200) };
    }
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "telegram error" };
  }
}

export function waveTelegramMessage(input: {
  sent: number;
  failed: number;
  dayTotal: number;
  dayCap: number;
  salesToday: number;
  salesGoal: number;
  place?: string;
}) {
  const stop = input.salesToday >= input.salesGoal;
  return [
    `NFCTap oleada`,
    `Enviados: ${input.sent} · fallos: ${input.failed}`,
    `Hoy: ${input.dayTotal}/${input.dayCap} mails`,
    `Ventas /negocio hoy: ${input.salesToday}/${input.salesGoal}${stop ? " → STOP oleadas" : ""}`,
    input.place ? `Zona: ${input.place}` : "",
  ]
    .filter(Boolean)
    .join("\n");
}

/** Resumen de los 3 hitos diarios (progreso / cierre). */
export function dailyTelegramDigest(input: {
  slot: TelegramSlot;
  dayTotal: number;
  dayCap: number;
  salesToday: number;
  salesGoal: number;
  waves: number;
  wavesPerDay: number;
  place?: string;
  /** Cola lista para mañana / siguientes oleadas */
  queued?: number;
  /** Webs pendientes de scrapear email */
  stockPending?: number;
}) {
  const stop = input.salesToday >= input.salesGoal;
  const title =
    input.slot === "morning"
      ? "NFCTap · progreso mañana (12:00)"
      : input.slot === "afternoon"
        ? "NFCTap · progreso tarde (16:00)"
        : "NFCTap · cierre día (21:00)";

  const queueLine =
    input.queued != null
      ? `Cola mails: ${input.queued}${input.queued >= 500 ? " ✓" : " (objetivo ≥500)"}`
      : "";
  const stockLine =
    input.stockPending != null ? `Stock webs pending: ${input.stockPending}` : "";

  return [
    title,
    `Mails hoy: ${input.dayTotal}/${input.dayCap}`,
    `Oleadas: ${input.waves}/${input.wavesPerDay}`,
    `Ventas /negocio: ${input.salesToday}/${input.salesGoal}${stop ? " → STOP (meta ok)" : " · seguimos"}`,
    queueLine,
    stockLine,
    input.place ? `Última zona: ${input.place}` : "",
    stop
      ? "No hace falta más oleada hoy."
      : input.slot === "close"
        ? "Fin de ventana. Mañana: harvest→extract→oleadas 08:00."
        : "Próximas oleadas según cron (o tope día).",
  ]
    .filter(Boolean)
    .join("\n");
}
