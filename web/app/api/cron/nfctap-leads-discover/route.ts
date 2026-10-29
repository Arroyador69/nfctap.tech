import { discoverIntoQueue, needRefill } from "@/lib/business-leads/discover";
import { loadQueue, queueCounts } from "@/lib/business-leads/queue";
import { getDayStats } from "@/lib/business-leads/stats";
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

/** Solo rellena cola (~1000). Separado del envío para no timeout. */
export async function GET(req: Request) {
  if (!authorized(req)) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const url = new URL(req.url);
  const waveParam = Number(url.searchParams.get("wave") || "");
  const osmOnly = url.searchParams.get("osmOnly") === "1";
  const day = await getDayStats();
  const before = queueCounts((await loadQueue()).leads);
  if (!needRefill(before.queued, 1000)) {
    return NextResponse.json({ ok: true, skipped: true, reason: "queue_full", queue: before });
  }

  // osmOnly=1: sin scrape web. Default: mapa OSM + scrape webs (más emails nuevos).
  const result = await discoverIntoQueue({
    targetQueued: 1000,
    maxPlaces: osmOnly ? 5 : 4,
    waveIndex: Number.isFinite(waveParam) ? waveParam : day.waves + before.queued,
    fetchWebEmails: !osmOnly,
    maxWebFetches: osmOnly ? 0 : 50,
    bboxesPerPlace: osmOnly ? 3 : 4,
  });

  return NextResponse.json({
    ok: true,
    before,
    ...result,
    queue: queueCounts((await loadQueue()).leads),
  });
}
