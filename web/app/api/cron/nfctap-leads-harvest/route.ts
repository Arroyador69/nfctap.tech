import { harvestWebsitesIntoStock } from "@/lib/business-leads/harvest-websites";
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

/**
 * Fase A: cosecha webs (Fuengirola → Costa → ES) → stock Blob.
 * No envía mails. No scrapea emails.
 */
export async function GET(req: Request) {
  if (!authorized(req)) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const url = new URL(req.url);
  const waveParam = Number(url.searchParams.get("wave") || "");
  const day = await getDayStats();
  const wave = Number.isFinite(waveParam)
    ? waveParam
    : day.waves + Math.floor(Date.now() / 600_000);

  const result = await harvestWebsitesIntoStock({
    waveIndex: wave,
    maxCells: 7,
    searchKeywords: 5,
    targetPending: 1500,
  });

  return NextResponse.json({ ok: true, wave, ...result });
}
