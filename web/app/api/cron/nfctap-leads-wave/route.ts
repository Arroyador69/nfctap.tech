import {
  NFC_LEADS_DAILY_HARD_CAP,
  NFC_LEADS_SEND_DELAY_MS,
  NFC_LEADS_WAVE_MAX,
  NFC_SALES_DAILY_GOAL,
} from "@/lib/business-leads/constants";
import { salesGoalReached } from "@/lib/business-leads/sales";
import { bumpDayStats, getDayStats } from "@/lib/business-leads/stats";
import { notifyTelegram } from "@/lib/business-leads/telegram";
import { sendNfctapOutreach } from "@/lib/business-leads/send-resend";
import { loadOptOut, loadQueue, markLead, queueCounts, takeQueued } from "@/lib/business-leads/queue";
import { discoverIntoQueue, needRefill } from "@/lib/business-leads/discover";
import { BRAND } from "@/lib/catalog";
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
 * Oleada: hasta 50 mails · tope 500/día · STOP si ≥10 ventas /negocio.
 * Ciudad y nombre salen de cada lead (no hay “Café de prueba”).
 */
export async function GET(req: Request) {
  if (!authorized(req)) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const url = new URL(req.url);
  const dry = url.searchParams.get("dry") === "1";

  const sales = await salesGoalReached();
  if (sales.stop) {
    await notifyTelegram(
      `NFCTap · STOP oleadas\nVentas hoy ${sales.count}/${NFC_SALES_DAILY_GOAL} (meta ok)`,
    );
    return NextResponse.json({ ok: true, stopped: true, reason: "sales_goal", sales });
  }

  const day = await getDayStats();
  if (day.sent >= NFC_LEADS_DAILY_HARD_CAP) {
    await notifyTelegram(`NFCTap · tope día ${day.sent}/${NFC_LEADS_DAILY_HARD_CAP} mails`);
    return NextResponse.json({ ok: true, stopped: true, reason: "daily_cap", day });
  }

  // Mantener margen hoy + mañana (~1000 en cola)
  const qFile = await loadQueue();
  const counts = queueCounts(qFile.leads);
  let discover = null as Awaited<ReturnType<typeof discoverIntoQueue>> | null;
  if (needRefill(counts.queued, 1000)) {
    try {
      discover = await discoverIntoQueue({
        targetQueued: 1000,
        maxPlaces: dry ? 4 : 10,
        waveIndex: day.waves,
        fetchWebEmails: !dry,
      });
    } catch (e) {
      discover = {
        places: [],
        osmHits: 0,
        withEmail: 0,
        added: 0,
        skipped: 0,
        queued: counts.queued,
      };
      console.error("discover", e);
    }
  }

  const room = Math.min(NFC_LEADS_WAVE_MAX, NFC_LEADS_DAILY_HARD_CAP - day.sent);
  const opt = await loadOptOut();
  const batch = (await takeQueued(room)).filter((l) => !opt.has(l.email.toLowerCase()));

  if (dry) {
    return NextResponse.json({
      ok: true,
      dry: true,
      room,
      sales,
      day,
      queue: counts,
      discover,
      sample: batch.slice(0, 5).map((l) => ({
        city: l.city,
        name: l.businessName,
        email: l.email.replace(/(^.).*(@.*$)/, "$1***$2"),
      })),
      note: "dry=1 no envía. Quita dry o dry=0 para enviar.",
    });
  }

  if (!batch.length) {
    await bumpDayStats({ sent: 0, failed: 0, place: "empty_queue" });
    return NextResponse.json({
      ok: true,
      sent: 0,
      note: "Cola vacía — lanza discover desde /dashboard/captacion",
      sales,
      discover,
      queue: counts,
    });
  }

  let sent = 0;
  let failed = 0;
  const cities = new Set<string>();

  for (const lead of batch) {
    if (opt.has(lead.email.toLowerCase())) {
      await markLead(lead.id, { status: "optout" });
      continue;
    }
    const r = await sendNfctapOutreach(lead.email, {
      businessName: lead.businessName,
      city: lead.city,
      websiteUrl: lead.websiteUrl,
      optOutUrl: `${BRAND.url}/api/outreach/opt-out?email=${encodeURIComponent(lead.email)}`,
    });
    cities.add(lead.city);
    if (r.ok) {
      sent++;
      await markLead(lead.id, { status: "sent", sentAt: new Date().toISOString() });
    } else {
      failed++;
      await markLead(lead.id, { status: "failed", error: r.error });
    }
    await new Promise((res) => setTimeout(res, NFC_LEADS_SEND_DELAY_MS));
  }

  const place = [...cities].slice(0, 4).join(", ") || "—";
  const nextDay = await bumpDayStats({ sent, failed, place });

  return NextResponse.json({
    ok: true,
    sent,
    failed,
    place,
    sales,
    day: nextDay,
    discover,
    queue: queueCounts((await loadQueue()).leads),
  });
}
