import {
  NFC_LEADS_DAILY_HARD_CAP,
  NFC_LEADS_SEND_DELAY_MS,
  NFC_LEADS_WAVE_MAX,
  NFC_SALES_DAILY_GOAL,
} from "@/lib/business-leads/constants";
import { discoverIntoQueue, needRefill } from "@/lib/business-leads/discover";
import {
  loadOptOut,
  loadQueue,
  markLead,
  queueCounts,
  takeQueued,
} from "@/lib/business-leads/queue";
import { salesGoalReached } from "@/lib/business-leads/sales";
import { sendNfctapOutreach } from "@/lib/business-leads/send-resend";
import { bumpDayStats, getDayStats } from "@/lib/business-leads/stats";
import { notifyTelegram, waveTelegramMessage } from "@/lib/business-leads/telegram";
import {
  expectedSentByNow,
  madridHourNow,
  WAVE_HOUR_END,
  WAVE_HOUR_START,
} from "@/lib/business-leads/wave-schedule";
import { BRAND } from "@/lib/catalog";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

/** ~1,8 s/mail → 50 mails ≈ 90 s; deja margen a discover ligero (<5 min). */
const MAX_PER_INVOKE = 50;

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
 * Oleadas automáticas (no tocar dashboard):
 * - Rellena cola si hace falta (~1000 = hoy+mañana)
 * - Catch-up al ritmo horario (no ráfaga 500)
 * - STOP si ≥10 ventas /negocio o tope 500
 */
export async function GET(req: Request) {
  if (!authorized(req)) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const url = new URL(req.url);
  const dry = url.searchParams.get("dry") === "1";
  const force = url.searchParams.get("force") === "1"; // permite fuera de ventana (arranque manual)
  const hour = madridHourNow();

  // Reparación one-shot contador día (tras migrar Blob): ?setSent=200
  const setSent = Number(url.searchParams.get("setSent") || "");
  if (force && Number.isFinite(setSent) && setSent >= 0 && setSent <= NFC_LEADS_DAILY_HARD_CAP) {
    const { madridDate } = await import("@/lib/business-leads/stats");
    const { put } = await import("@vercel/blob");
    const date = madridDate();
    const next = {
      date,
      sent: setSent,
      failed: 0,
      waves: Math.ceil(setSent / NFC_LEADS_WAVE_MAX),
      lastWaveAt: new Date().toISOString(),
      lastPlace: "seed_counter",
    };
    await put(`nfctap-outreach-day-${date}.json`, JSON.stringify(next), {
      access: "private",
      addRandomSuffix: false,
      allowOverwrite: true,
      contentType: "application/json",
    });
    return NextResponse.json({ ok: true, seeded: next });
  }

  const sales = await salesGoalReached();
  if (sales.stop) {
    await notifyTelegram(
      `NFCTap · STOP oleadas\nVentas hoy ${sales.count}/${NFC_SALES_DAILY_GOAL} (meta ok)`,
    );
    return NextResponse.json({ ok: true, stopped: true, reason: "sales_goal", sales });
  }

  const day = await getDayStats();
  if (day.sent >= NFC_LEADS_DAILY_HARD_CAP) {
    return NextResponse.json({ ok: true, stopped: true, reason: "daily_cap", day, sales });
  }

  if (!force && (hour < WAVE_HOUR_START || hour > WAVE_HOUR_END)) {
    return NextResponse.json({
      ok: true,
      skipped: true,
      reason: "outside_window",
      hourMadrid: hour,
      window: `${WAVE_HOUR_START}–${WAVE_HOUR_END}`,
      day,
      sales,
    });
  }

  // Discover ligero solo si la cola está seca (el cron discover rellena el grueso)
  const qBefore = queueCounts((await loadQueue()).leads);
  let discover = null as Awaited<ReturnType<typeof discoverIntoQueue>> | null;
  // Si ya hay cola, no discover aquí (lo hace el cron discover). Evita timeout.
  if (needRefill(qBefore.queued, 30)) {
    try {
      discover = await discoverIntoQueue({
        targetQueued: 80,
        maxPlaces: 1,
        waveIndex: day.waves,
        fetchWebEmails: !dry,
        maxWebFetches: dry ? 0 : 12,
        bboxesPerPlace: 2,
      });
    } catch (e) {
      console.error("discover", e);
      discover = {
        places: [],
        osmHits: 0,
        withEmail: 0,
        added: 0,
        skipped: 0,
        queued: qBefore.queued,
      };
    }
  }

  const expected = expectedSentByNow(hour);
  const behind = Math.max(0, expected - day.sent);
  // Si vamos al día (behind=0), igual enviamos 1 oleada de 50 en el tick del cron
  const want = behind > 0 ? behind : NFC_LEADS_WAVE_MAX;
  const room = Math.min(want, NFC_LEADS_DAILY_HARD_CAP - day.sent, MAX_PER_INVOKE);

  const opt = await loadOptOut();
  const batch = (await takeQueued(room)).filter((l) => !opt.has(l.email.toLowerCase()));

  if (dry) {
    return NextResponse.json({
      ok: true,
      dry: true,
      hourMadrid: hour,
      expected,
      behind,
      room,
      sales,
      day,
      queue: queueCounts((await loadQueue()).leads),
      discover,
      sample: batch.slice(0, 3).map((l) => ({
        city: l.city,
        name: l.businessName,
        email: l.email.replace(/(^.).*(@.*$)/, "$1***$2"),
      })),
    });
  }

  if (!batch.length) {
    await bumpDayStats({ sent: 0, failed: 0, place: "empty_queue" });
    await notifyTelegram(
      `NFCTap · cola vacía a las ${hour}:00\nDiscover añadidos: ${discover?.added ?? 0}\nRevisa Resend/Blob si sigue 0.`,
    );
    return NextResponse.json({
      ok: true,
      sent: 0,
      note: "Cola vacía tras discover",
      sales,
      discover,
      queue: queueCounts((await loadQueue()).leads),
    });
  }

  const firstWaveToday = day.sent === 0 && day.waves === 0;
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

  // Aviso corto al arrancar el día; los 3 digests van en el otro cron
  if (firstWaveToday && sent > 0) {
    await notifyTelegram(
      [
        "NFCTap · oleadas arrancadas (automático)",
        waveTelegramMessage({
          sent,
          failed,
          dayTotal: nextDay.sent,
          dayCap: NFC_LEADS_DAILY_HARD_CAP,
          salesToday: sales.count,
          salesGoal: NFC_SALES_DAILY_GOAL,
          place,
        }),
        "Telegram progreso: 12:00 · 16:00 · 21:00 Madrid",
      ].join("\n"),
    );
  }

  return NextResponse.json({
    ok: true,
    automatic: true,
    hourMadrid: hour,
    expected,
    sent,
    failed,
    place,
    sales,
    day: nextDay,
    discover,
    queue: queueCounts((await loadQueue()).leads),
  });
}
