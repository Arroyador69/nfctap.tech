import {
  NFC_LEADS_DAILY_HARD_CAP,
  NFC_LEADS_WAVES_PER_DAY,
} from "@/lib/business-leads/constants";
import { loadQueue, queueCounts } from "@/lib/business-leads/queue";
import { salesGoalReached } from "@/lib/business-leads/sales";
import { getDayStats } from "@/lib/business-leads/stats";
import { dailyTelegramDigest, notifyTelegram } from "@/lib/business-leads/telegram";
import {
  madridHourNow,
  telegramSlotForHour,
} from "@/lib/business-leads/wave-schedule";
import { loadWebsiteStock, stockCounts } from "@/lib/business-leads/website-stock";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

/**
 * 3 Telegram/día (como Delfín): 12:00 · 16:00 · 21:00 Madrid.
 * Cron UTC: 0 11,15,20 * * 1-5 (invierno CET).
 * ?slot=morning|afternoon|close fuerza el mensaje (admin/test).
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

  const forced = url.searchParams.get("slot") as "morning" | "afternoon" | "close" | null;
  const slot = forced || telegramSlotForHour(madridHourNow());
  if (!slot) {
    return NextResponse.json({
      ok: true,
      skipped: true,
      reason: "not_digest_hour",
      hourMadrid: madridHourNow(),
    });
  }

  const [day, sales, qFile, stockFile] = await Promise.all([
    getDayStats(),
    salesGoalReached(),
    loadQueue(),
    loadWebsiteStock(),
  ]);
  const queue = queueCounts(qFile.leads);
  const stock = stockCounts(stockFile.items);
  const text = dailyTelegramDigest({
    slot,
    dayTotal: day.sent,
    dayCap: NFC_LEADS_DAILY_HARD_CAP,
    salesToday: sales.count,
    salesGoal: sales.goal,
    waves: day.waves,
    wavesPerDay: NFC_LEADS_WAVES_PER_DAY,
    place: day.lastPlace,
    queued: queue.queued,
    stockPending: stock.pending,
  });
  const tg = await notifyTelegram(text);
  return NextResponse.json({
    ok: tg.ok,
    slot,
    telegram: tg,
    day,
    sales,
    queue,
    stock,
  });
}
