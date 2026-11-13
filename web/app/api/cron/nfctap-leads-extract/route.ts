import {
  NFC_LEADS_MIN_QUEUED,
  NFC_LEADS_TARGET_QUEUED,
} from "@/lib/business-leads/constants";
import { extractEmailsFromStock } from "@/lib/business-leads/extract-batch";
import { loadQueue, queueCounts } from "@/lib/business-leads/queue";
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
 * Fase B: scrapea emails del stock de webs → cola de oleadas.
 */
export async function GET(req: Request) {
  if (!authorized(req)) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const beforeQ = queueCounts((await loadQueue()).leads);
  const beforeS = stockCounts((await loadWebsiteStock()).items);
  if (beforeQ.queued >= NFC_LEADS_TARGET_QUEUED) {
    return NextResponse.json({
      ok: true,
      skipped: true,
      reason: "queue_full",
      queue: beforeQ,
      stock: beforeS,
      targetQueued: NFC_LEADS_TARGET_QUEUED,
    });
  }
  const critical = beforeQ.queued < 150;
  let recycled = { recycled: 0, pending: beforeS.pending };
  if (beforeS.pending < 1 && beforeQ.queued < NFC_LEADS_MIN_QUEUED) {
    recycled = await recycleNoEmailToPending({
      max: critical ? 420 : 320,
      minAgeDays: critical ? 3 : 5,
    });
  }
  const stockNow = stockCounts((await loadWebsiteStock()).items);
  if (stockNow.pending < 1) {
    return NextResponse.json({
      ok: true,
      skipped: true,
      reason: "stock_empty",
      recycled,
      queue: beforeQ,
      stock: stockNow,
    });
  }

  const result = await extractEmailsFromStock({
    maxPages: critical ? 70 : beforeQ.queued < NFC_LEADS_MIN_QUEUED ? 60 : 45,
    targetQueued: NFC_LEADS_TARGET_QUEUED,
  });

  return NextResponse.json({
    ok: true,
    recycled,
    before: { queue: beforeQ, stock: beforeS },
    ...result,
    queue: queueCounts((await loadQueue()).leads),
    stock: stockCounts((await loadWebsiteStock()).items),
  });
}
