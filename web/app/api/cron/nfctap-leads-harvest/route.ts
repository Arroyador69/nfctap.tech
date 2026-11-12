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
  const starved = queued < 300 || pending < 120;
  const wave = Number.isFinite(waveParam)
    ? waveParam
    : harvestProgressIndex(day.waves, hour, madridDate());

  const result = await harvestWebsitesIntoStock({
    waveIndex: wave,
    maxCells: starved ? 14 : 10,
    searchKeywords: starved ? 10 : 8,
    targetPending: 2000,
    enqueueOsmEmails: true,
  });

  let retry: Awaited<ReturnType<typeof harvestWebsitesIntoStock>> | null = null;
  if (result.websAdded === 0 && result.emailsQueued === 0 && starved) {
    retry = await harvestWebsitesIntoStock({
      waveIndex: wave + 41,
      maxCells: 14,
      searchKeywords: 10,
      targetPending: 2000,
      enqueueOsmEmails: true,
    });
  }

  const final =
    retry && (retry.websAdded > 0 || retry.emailsQueued > 0) ? retry : result;

  let recycled = { recycled: 0, pending: 0 };
  if (starved && final.websAdded === 0 && final.emailsQueued === 0) {
    recycled = await recycleNoEmailToPending({ max: 280, minAgeDays: 5 });
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
