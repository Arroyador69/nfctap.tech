import { extractEmailsFromStock } from "@/lib/business-leads/extract-batch";
import { harvestWebsitesIntoStock } from "@/lib/business-leads/harvest-websites";
import { loadQueue, queueCounts } from "@/lib/business-leads/queue";
import { getDayStats } from "@/lib/business-leads/stats";
import { loadWebsiteStock, stockCounts } from "@/lib/business-leads/website-stock";
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
 * Orquestador del flujo nuevo (2 fases):
 * 1) harvest webs → stock
 * 2) extract emails → cola envío
 *
 * Preferible usar crons separados harvest/extract; este queda por compatibilidad.
 */
export async function GET(req: Request) {
  if (!authorized(req)) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const url = new URL(req.url);
  const waveParam = Number(url.searchParams.get("wave") || "");
  const phase = url.searchParams.get("phase") || "both"; // harvest | extract | both
  const day = await getDayStats();
  const wave = Number.isFinite(waveParam)
    ? waveParam
    : day.waves + Math.floor(Date.now() / 600_000);

  const before = {
    queue: queueCounts((await loadQueue()).leads),
    stock: stockCounts((await loadWebsiteStock()).items),
  };

  let harvest = null as Awaited<ReturnType<typeof harvestWebsitesIntoStock>> | null;
  let extract = null as Awaited<ReturnType<typeof extractEmailsFromStock>> | null;

  if (phase === "harvest" || phase === "both") {
    harvest = await harvestWebsitesIntoStock({
      waveIndex: wave,
      maxCells: phase === "both" ? 5 : 7,
      searchKeywords: phase === "both" ? 3 : 5,
      targetPending: 1500,
    });
  }

  if (phase === "extract" || phase === "both") {
    extract = await extractEmailsFromStock({
      maxPages: phase === "both" ? 30 : 45,
      targetQueued: 1000,
    });
  }

  return NextResponse.json({
    ok: true,
    flow: "harvest→extract",
    wave,
    before,
    harvest,
    extract,
    queue: queueCounts((await loadQueue()).leads),
    stock: stockCounts((await loadWebsiteStock()).items),
  });
}
