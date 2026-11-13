import {
  NFC_LEADS_MIN_PENDING,
  NFC_LEADS_MIN_QUEUED,
  NFC_LEADS_TARGET_PENDING,
  NFC_LEADS_TARGET_QUEUED,
} from "@/lib/business-leads/constants";
import { harvestWebsitesIntoStock } from "@/lib/business-leads/harvest-websites";
import { loadQueue, queueCounts } from "@/lib/business-leads/queue";
import { getDayStats, madridDate } from "@/lib/business-leads/stats";
import { harvestProgressIndex } from "@/lib/business-leads/wave-plan";
import { madridHourNow } from "@/lib/business-leads/wave-schedule";
import {
  loadWebsiteStock,
  recycleNoEmailToPending,
  stockCounts,
} from "@/lib/business-leads/website-stock";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

function authorized(req: Request) {
  const url = new URL(req.url);
  const secret = process.env.CRON_SECRET?.trim();
  const auth = req.headers.get("authorization") || "";
  const bearer = auth.startsWith("Bearer ") ? auth.slice(7) : "";
  const q = url.searchParams.get("secret") || "";
  const vercelCron = req.headers.get("x-vercel-cron") === "1";
  if (!secret) return process.env.NODE_ENV !== "production" || vercelCron;
  return bearer === secret || q === secret || vercelCron;
}

/**
 * Fase A: cosecha webs (Fuengirola → Costa → ES) → stock Blob.
 * No envía mails. Avanza geografía cada día/hora; reintenta si la zona está agotada.
 */
export async function GET(req: Request) {
  if (!authorized(req)) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const url = new URL(req.url);
  const waveRaw = url.searchParams.get("wave");
  const waveParam = waveRaw != null && waveRaw !== "" ? Number(waveRaw) : NaN;
  const day = await getDayStats();
  const hour = madridHourNow();
  const queued = queueCounts((await loadQueue()).leads).queued;
  const pending = stockCounts((await loadWebsiteStock()).items).pending;
  // Buffer diario: nunca por debajo del mínimo operativo
  const starved =
    queued < NFC_LEADS_MIN_QUEUED || pending < NFC_LEADS_MIN_PENDING;
  const critical = queued < 150 || pending < 40;
  const wave = Number.isFinite(waveParam)
    ? waveParam
    : harvestProgressIndex(day.waves, hour, madridDate());

  const result = await harvestWebsitesIntoStock({
    waveIndex: wave,
    maxCells: critical ? 16 : starved ? 14 : 10,
    searchKeywords: critical ? 12 : starved ? 10 : 8,
    targetPending: NFC_LEADS_TARGET_PENDING,
    enqueueOsmEmails: true,
  });

  let retry: Awaited<ReturnType<typeof harvestWebsitesIntoStock>> | null = null;
  if (
    (result.websAdded === 0 && result.emailsQueued === 0 && starved) ||
    queueCounts((await loadQueue()).leads).queued < NFC_LEADS_MIN_QUEUED
  ) {
    retry = await harvestWebsitesIntoStock({
      waveIndex: wave + 41 + hour,
      maxCells: 16,
      searchKeywords: 12,
      targetPending: NFC_LEADS_TARGET_PENDING,
      enqueueOsmEmails: true,
    });
  }

  const final =
    retry && (retry.websAdded > 0 || retry.emailsQueued > 0) ? retry : result;

  let recycled = { recycled: 0, pending: 0 };
  const queuedAfter = queueCounts((await loadQueue()).leads).queued;
  const pendingAfter = stockCounts((await loadWebsiteStock()).items).pending;
  if (
    (queuedAfter < NFC_LEADS_TARGET_QUEUED || pendingAfter < NFC_LEADS_MIN_PENDING) &&
    final.websAdded === 0 &&
    final.emailsQueued === 0
  ) {
    recycled = await recycleNoEmailToPending({
      max: critical ? 420 : 320,
      minAgeDays: critical ? 3 : 5,
    });
  }

  return NextResponse.json({
    ok: true,
    wave,
    starved,
    queued,
    pendingBefore: pending,
    retried: Boolean(retry),
    recycled,
    ...final,
    added: final.websAdded,
    stock: stockCounts((await loadWebsiteStock()).items),
    queue: queueCounts((await loadQueue()).leads),
  });
}
