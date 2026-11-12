import { notifyTelegram } from "@/lib/business-leads/telegram";
import { CALL_DURATION_MIN, CALL_PROJECT_LABEL } from "@/lib/sales-calls/constants";
import { formatWhenMadrid, sendBookingReminderEmail } from "@/lib/sales-calls/mail";
import { loadSalesCalls, saveSalesCalls } from "@/lib/sales-calls/store";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

function authorized(req: Request) {
  const secret = process.env.CRON_SECRET?.trim();
  const auth = req.headers.get("authorization") || "";
  const bearer = auth.startsWith("Bearer ") ? auth.slice(7) : "";
  const q = new URL(req.url).searchParams.get("secret") || "";
  const vercelCron = req.headers.get("x-vercel-cron") === "1";
  if (!secret) return vercelCron || process.env.NODE_ENV !== "production";
  return bearer === secret || q === secret || vercelCron;
}

/**
 * Cada ~15 min: recordatorio al cliente ~1 h antes de la llamada.
 * Ventana: entre 50 y 70 minutos antes del inicio.
 */
export async function GET(req: Request) {
  if (!authorized(req)) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const now = Date.now();
  const minBefore = 50 * 60_000;
  const maxBefore = 70 * 60_000;
  const file = await loadSalesCalls();
  let sent = 0;
  let skipped = 0;
  let failed = 0;

  for (let i = 0; i < file.bookings.length; i++) {
    const b = file.bookings[i];
    if (b.status !== "booked") continue;
    if (b.reminderSentAt) {
      skipped++;
      continue;
    }
    const start = new Date(b.startsAt).getTime();
    const delta = start - now;
    if (delta < minBefore || delta > maxBefore) continue;

    try {
      const r = await sendBookingReminderEmail(b);
      if (!r.ok) {
        failed++;
        continue;
      }
      file.bookings[i] = {
        ...b,
        reminderSentAt: new Date().toISOString(),
      };
      sent++;
      await notifyTelegram(
        [
          `${CALL_PROJECT_LABEL[b.project]} · recordatorio 1 h enviado`,
          `📅 ${formatWhenMadrid(b.startsAt)} · ${CALL_DURATION_MIN} min`,
          `👤 ${b.name} · ${b.email}`,
        ].join("\n"),
      );
    } catch {
      failed++;
    }
  }

  if (sent > 0) await saveSalesCalls(file);

  return NextResponse.json({ ok: true, sent, skipped, failed });
}
