import { isAdmin } from "@/lib/auth";
import { discoverIntoQueue } from "@/lib/business-leads/discover";
import { loadQueue, queueCounts } from "@/lib/business-leads/queue";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

/**
 * POST { targetQueued?, maxPlaces?, fetchWebEmails? } — admin.
 * Rellena cola Blob con emails públicos OSM (ciudad por lead).
 */
export async function POST(req: Request) {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const body = (await req.json().catch(() => ({}))) as {
    targetQueued?: number;
    maxPlaces?: number;
    fetchWebEmails?: boolean;
    waveIndex?: number;
  };

  try {
    const result = await discoverIntoQueue({
      targetQueued: Math.min(2000, Math.max(100, body.targetQueued || 1000)),
      maxPlaces: Math.min(20, Math.max(2, body.maxPlaces || 12)),
      fetchWebEmails: body.fetchWebEmails !== false,
      waveIndex: body.waveIndex || 0,
    });
    const counts = queueCounts((await loadQueue()).leads);
    return NextResponse.json({ ok: true, ...result, queue: counts });
  } catch (e) {
    return NextResponse.json(
      { ok: false, error: e instanceof Error ? e.message : "Error discover" },
      { status: 502 },
    );
  }
}

export async function GET() {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }
  const counts = queueCounts((await loadQueue()).leads);
  return NextResponse.json({ ok: true, queue: counts });
}
