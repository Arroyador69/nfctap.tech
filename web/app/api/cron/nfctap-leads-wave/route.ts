import {
  NFC_LEADS_DAILY_HARD_CAP,
  NFC_LEADS_WAVE_MAX,
  NFC_SALES_DAILY_GOAL,
} from "@/lib/business-leads/constants";
import { salesGoalReached } from "@/lib/business-leads/sales";
import { bumpDayStats, getDayStats } from "@/lib/business-leads/stats";
import { notifyTelegram } from "@/lib/business-leads/telegram";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * Stub de oleada. Auth: Authorization Bearer CRON_SECRET (o ?secret=).
 * La cola discover/send real se engancha aquí cuando haya business_leads en Blob.
 * Hoy: comprueba meta ventas, tope día y avisa por Telegram (sin spamear).
 */
export async function GET(req: Request) {
  const url = new URL(req.url);
  const secret = process.env.CRON_SECRET?.trim();
  const auth = req.headers.get("authorization") || "";
  const bearer = auth.startsWith("Bearer ") ? auth.slice(7) : "";
  const q = url.searchParams.get("secret") || "";
  const vercelCron = req.headers.get("x-vercel-cron") === "1";
  const okAuth = secret
    ? bearer === secret || q === secret || vercelCron
    : process.env.NODE_ENV !== "production" || vercelCron;
  if (!okAuth) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const sales = await salesGoalReached();
  if (sales.stop) {
    await notifyTelegram(
      `NFCTap · STOP oleadas\nVentas hoy ${sales.count}/${NFC_SALES_DAILY_GOAL} (meta ok)`,
    );
    return NextResponse.json({
      ok: true,
      stopped: true,
      reason: "sales_goal",
      sales,
    });
  }

  const day = await getDayStats();
  if (day.sent >= NFC_LEADS_DAILY_HARD_CAP) {
    await notifyTelegram(
      `NFCTap · tope día ${day.sent}/${NFC_LEADS_DAILY_HARD_CAP} mails`,
    );
    return NextResponse.json({ ok: true, stopped: true, reason: "daily_cap", day });
  }

  // Placeholder: aún no hay cola business_leads. No envía mails.
  const room = Math.min(NFC_LEADS_WAVE_MAX, NFC_LEADS_DAILY_HARD_CAP - day.sent);
  const dry = url.searchParams.get("dry") !== "0";

  if (dry) {
    // No spamear Telegram en cada cron horario: solo los 3 digest (12/16/21).
    return NextResponse.json({
      ok: true,
      dry: true,
      room,
      sales,
      day,
      telegram: { skipped: true, reason: "digest_only_3x_day" },
      note: "Cola aún stub. Telegram progreso: cron nfctap-telegram-digest 12/16/21 Madrid.",
    });
  }

  // dry=0 sin cola: no inventar envíos
  await bumpDayStats({ sent: 0, failed: 0, place: "empty_queue" });
  return NextResponse.json({
    ok: true,
    dry: false,
    sent: 0,
    note: "Cola vacía — no se envió nada",
    sales,
  });
}
