import {
  NFC_LEADS_COLD_DAILY_CAP,
  NFC_LEADS_DAILY_HARD_CAP,
  NFC_LEADS_FU_DAILY_CAP,
  NFC_LEADS_SEND_DELAY_MS,
  NFC_LEADS_WAVE_MAX,
  NFC_SALES_DAILY_GOAL,
} from "@/lib/business-leads/constants";
import { extractEmailsFromStock } from "@/lib/business-leads/extract-batch";
import { harvestWebsitesIntoStock } from "@/lib/business-leads/harvest-websites";
import {
  loadOptOut,
  loadQueue,
  markLead,
  queueCounts,
  saveQueue,
  takeQueued,
  type BusinessLead,
  type TouchKind,
} from "@/lib/business-leads/queue";
import { paidUnicaEmailSet, salesGoalReached } from "@/lib/business-leads/sales";
import {
  backfillFollowUpSchedules,
  patchAfterColdSend,
  patchAfterFollowUpSent,
  patchAfterSale,
  selectFollowUpDue,
  sequenceCounts,
} from "@/lib/business-leads/sequence";
import { sendNfctapOutreach } from "@/lib/business-leads/send-resend";
import { bumpDayStats, effectiveColdFu, getDayStats } from "@/lib/business-leads/stats";
import { notifyTelegram, waveTelegramMessage } from "@/lib/business-leads/telegram";
import { loadWebsiteStock, stockCounts } from "@/lib/business-leads/website-stock";
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

/** ~1,8 s/mail → 50 mails ≈ 90 s. */
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

function outreachVars(lead: BusinessLead) {
  return {
    businessName: lead.businessName,
    city: lead.city,
    websiteUrl: lead.websiteUrl,
    optOutUrl: `${BRAND.url}/api/outreach/opt-out?email=${encodeURIComponent(lead.email)}`,
  };
}

/**
 * Oleadas: follow-up priorizado (A→B→C) + cold hasta cupos.
 * - Cold ~350/día · FU ~150/día · tope 500
 * - STOP si ≥10 ventas /negocio
 * - ?backfillFollowUp=1 programa FU en leads ya enviados
 */
export async function GET(req: Request) {
  if (!authorized(req)) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const url = new URL(req.url);
  const dry = url.searchParams.get("dry") === "1";
  const force = url.searchParams.get("force") === "1";
  const backfill = url.searchParams.get("backfillFollowUp") === "1";
  const hour = madridHourNow();

  const setSentRaw = url.searchParams.get("setSent");
  if (force && setSentRaw != null && setSentRaw !== "") {
    const setSent = Number(setSentRaw);
    if (!Number.isFinite(setSent) || setSent < 0 || setSent > NFC_LEADS_DAILY_HARD_CAP) {
      return NextResponse.json({ error: "setSent inválido" }, { status: 400 });
    }
    const { madridDate } = await import("@/lib/business-leads/stats");
    const { put } = await import("@vercel/blob");
    const date = madridDate();
    const next = {
      date,
      sent: setSent,
      failed: 0,
      coldSent: setSent,
      fuSent: 0,
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

  if (backfill && force) {
    const file = await loadQueue();
    const result = backfillFollowUpSchedules(file.leads);
    if (!dry) await saveQueue(result.leads);
    return NextResponse.json({
      ok: true,
      backfill: true,
      dry,
      updated: result.updated,
      tiers: result.tiers,
      sequence: sequenceCounts(result.leads),
    });
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
    const q = await loadQueue();
    return NextResponse.json({
      ok: true,
      skipped: true,
      reason: "outside_window",
      hourMadrid: hour,
      window: `${WAVE_HOUR_START}–${WAVE_HOUR_END}`,
      day,
      sales,
      sequence: sequenceCounts(q.leads),
      caps: {
        hard: NFC_LEADS_DAILY_HARD_CAP,
        cold: NFC_LEADS_COLD_DAILY_CAP,
        fu: NFC_LEADS_FU_DAILY_CAP,
      },
    });
  }

  const qBefore = queueCounts((await loadQueue()).leads);
  let refill = null as {
    harvest?: Awaited<ReturnType<typeof harvestWebsitesIntoStock>>;
    extract?: Awaited<ReturnType<typeof extractEmailsFromStock>>;
  } | null;
  if (!dry && qBefore.queued < 40) {
    try {
      const stock = stockCounts((await loadWebsiteStock()).items);
      const harvest =
        stock.pending < 30
          ? await harvestWebsitesIntoStock({
              waveIndex: day.waves,
              maxCells: 3,
              searchKeywords: 2,
              targetPending: 200,
            })
          : undefined;
      const extract = await extractEmailsFromStock({
        maxPages: 25,
        targetQueued: 120,
      });
      refill = { harvest, extract };
    } catch (e) {
      console.error("refill", e);
      refill = {};
    }
  }

  const expected = expectedSentByNow(hour);
  const behind = Math.max(0, expected - day.sent);
  const want = behind > 0 ? behind : NFC_LEADS_WAVE_MAX;
  const room = Math.min(want, NFC_LEADS_DAILY_HARD_CAP - day.sent, MAX_PER_INVOKE);

  const opt = await loadOptOut();
  const buyers = await paidUnicaEmailSet();
  const qFile = await loadQueue();

  // Silenciar compradores en cola
  let stoppedBuyers = 0;
  if (!dry) {
    for (let i = 0; i < qFile.leads.length; i++) {
      const l = qFile.leads[i];
      if (buyers.has(l.email.toLowerCase()) && l.sequenceStatus !== "stopped_sale") {
        qFile.leads[i] = { ...l, ...patchAfterSale() };
        stoppedBuyers++;
      }
    }
    if (stoppedBuyers) await saveQueue(qFile.leads);
  }

  const { coldSent: coldSentDay, fuSent: fuSentDay } = effectiveColdFu(day);
  let fuRoom = Math.min(room, Math.max(0, NFC_LEADS_FU_DAILY_CAP - fuSentDay));
  // Si el cold ya está al tope, el resto del hard cap puede ir a FU
  if (coldSentDay >= NFC_LEADS_COLD_DAILY_CAP) {
    fuRoom = Math.min(room, Math.max(0, NFC_LEADS_DAILY_HARD_CAP - day.sent));
  }

  const fuBatch = selectFollowUpDue(qFile.leads, fuRoom, opt).filter(
    (l) => !buyers.has(l.email.toLowerCase()),
  );

  const afterFu = room - fuBatch.length;
  // Cold: cupo cold, pero si no hay FU due, usar hueco del día (hasta hard cap)
  let coldRoom = Math.min(
    afterFu,
    Math.max(0, NFC_LEADS_COLD_DAILY_CAP - coldSentDay),
  );
  if (fuBatch.length === 0 && afterFu > coldRoom) {
    coldRoom = Math.min(afterFu, Math.max(0, NFC_LEADS_DAILY_HARD_CAP - day.sent));
  }

  const coldBatch = (await takeQueued(coldRoom)).filter(
    (l) => !opt.has(l.email.toLowerCase()) && !buyers.has(l.email.toLowerCase()),
  );

  const seq = sequenceCounts(qFile.leads);

  if (dry) {
    return NextResponse.json({
      ok: true,
      dry: true,
      hourMadrid: hour,
      expected,
      behind,
      room,
      fuRoom,
      coldRoom,
      sales,
      day,
      caps: {
        hard: NFC_LEADS_DAILY_HARD_CAP,
        cold: NFC_LEADS_COLD_DAILY_CAP,
        fu: NFC_LEADS_FU_DAILY_CAP,
      },
      sequence: seq,
      stoppedBuyers,
      sampleFu: fuBatch.slice(0, 5).map((l) => ({
        tier: l.nextTouchKind,
        city: l.city,
        name: l.businessName,
        email: l.email.replace(/(^.).*(@.*$)/, "$1***$2"),
        nextTouchAt: l.nextTouchAt,
      })),
      sampleCold: coldBatch.slice(0, 3).map((l) => ({
        city: l.city,
        name: l.businessName,
        email: l.email.replace(/(^.).*(@.*$)/, "$1***$2"),
      })),
      queue: queueCounts(qFile.leads),
      refill,
    });
  }

  if (!fuBatch.length && !coldBatch.length) {
    await bumpDayStats({ sent: 0, failed: 0, place: "empty_queue" });
    await notifyTelegram(
      `NFCTap · nada que enviar a las ${hour}:00\nFU due ${seq.dueTotal} · cola ${qBefore.queued}\nExtract +${refill?.extract?.added ?? 0}`,
    );
    return NextResponse.json({
      ok: true,
      sent: 0,
      note: "Sin FU due ni cold en cola",
      sales,
      sequence: seq,
      refill,
      queue: queueCounts((await loadQueue()).leads),
    });
  }

  const firstWaveToday = day.sent === 0 && day.waves === 0;
  let sent = 0;
  let failed = 0;
  let coldSent = 0;
  let fuSent = 0;
  const cities = new Set<string>();

  async function sendOne(lead: BusinessLead, touch: TouchKind) {
    if (opt.has(lead.email.toLowerCase())) {
      await markLead(lead.id, { status: "optout", sequenceStatus: "stopped_optout" });
      return;
    }
    if (buyers.has(lead.email.toLowerCase())) {
      await markLead(lead.id, patchAfterSale());
      return;
    }
    const r = await sendNfctapOutreach(lead.email, outreachVars(lead), touch);
    cities.add(lead.city);
    const at = new Date().toISOString();
    if (r.ok) {
      sent++;
      if (touch === "cold") {
        coldSent++;
        await markLead(lead.id, {
          status: "sent",
          sentAt: at,
          resendId: r.id || undefined,
          ...patchAfterColdSend(at),
        });
      } else {
        fuSent++;
        await markLead(lead.id, {
          resendId: r.id || undefined,
          ...patchAfterFollowUpSent(lead, touch, at),
        });
      }
    } else {
      failed++;
      await markLead(lead.id, { status: "failed", error: r.error });
    }
    await new Promise((res) => setTimeout(res, NFC_LEADS_SEND_DELAY_MS));
  }

  for (const lead of fuBatch) {
    const touch = (lead.nextTouchKind || "fu_open") as TouchKind;
    if (touch === "cold") continue;
    await sendOne(lead, touch);
  }
  for (const lead of coldBatch) {
    await sendOne(lead, "cold");
  }

  const place = [...cities].slice(0, 4).join(", ") || "—";
  const nextDay = await bumpDayStats({
    sent,
    failed,
    coldSent,
    fuSent,
    place: fuSent ? `FU ${fuSent}+cold ${coldSent} · ${place}` : place,
  });

  if (firstWaveToday && sent > 0) {
    await notifyTelegram(
      [
        "NFCTap · oleadas + follow-up (automático)",
        waveTelegramMessage({
          sent,
          failed,
          dayTotal: nextDay.sent,
          dayCap: NFC_LEADS_DAILY_HARD_CAP,
          salesToday: sales.count,
          salesGoal: NFC_SALES_DAILY_GOAL,
          place,
        }),
        `Cold ${nextDay.coldSent || 0}/${NFC_LEADS_COLD_DAILY_CAP} · FU ${nextDay.fuSent || 0}/${NFC_LEADS_FU_DAILY_CAP}`,
        "Telegram: 12:00 · 16:00 · 21:00 Madrid",
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
    coldSent,
    fuSent,
    place,
    sales,
    day: nextDay,
    sequence: sequenceCounts((await loadQueue()).leads),
    refill,
    queue: queueCounts((await loadQueue()).leads),
  });
}
