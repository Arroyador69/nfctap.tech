import { extractEmailsFromStock } from "@/lib/business-leads/extract-batch";
import { loadQueue, queueCounts } from "@/lib/business-leads/queue";
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
 * Fase B: scrapea emails del stock de webs → cola de oleadas.
 */
export async function GET(req: Request) {
  if (!authorized(req)) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const beforeQ = queueCounts((await loadQueue()).leads);
  const beforeS = stockCounts((await loadWebsiteStock()).items);
  if (beforeQ.queued >= 1000) {
    return NextResponse.json({
      ok: true,
      skipped: true,
      reason: "queue_full",
      queue: beforeQ,
      stock: beforeS,
    });
  }
  if (beforeS.pending < 1) {
    return NextResponse.json({
      ok: true,
      skipped: true,
      reason: "stock_empty",
      queue: beforeQ,
      stock: beforeS,
    });
  }

  const result = await extractEmailsFromStock({
    maxPages: 45,
    targetQueued: 1000,
  });

  return NextResponse.json({
    ok: true,
    before: { queue: beforeQ, stock: beforeS },
    ...result,
    queue: queueCounts((await loadQueue()).leads),
    stock: stockCounts((await loadWebsiteStock()).items),
  });
}
