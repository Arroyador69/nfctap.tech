import {
  NFC_LEADS_COLD_DAILY_CAP,
  NFC_LEADS_DAILY_HARD_CAP,
  NFC_LEADS_FU_DAILY_CAP,
  NFC_LEADS_MIN_PENDING,
  NFC_LEADS_MIN_QUEUED,
  NFC_LEADS_SEND_DELAY_MS,
  NFC_LEADS_TARGET_PENDING,
  NFC_LEADS_TARGET_QUEUED,
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
  promoteOverdueClickFollowUps,
  promoteOverdueOpenFollowUps,
  sequenceCounts,
  syncStopsOnLeads,
} from "@/lib/business-leads/sequence";
import { sendNfctapOutreach } from "@/lib/business-leads/send-resend";
import { bumpDayStats, effectiveColdFu, getDayStats, madridDate } from "@/lib/business-leads/stats";
import { notifyTelegram, waveTelegramMessage } from "@/lib/business-leads/telegram";
import { loadWebsiteStock, stockCounts } from "@/lib/business-leads/website-stock";
import { harvestProgressIndex, planWavePicks } from "@/lib/business-leads/wave-plan";
import {
  canSendThisHour,
  expectedSentByNow,
  madridHourNow,
  WAVE_HOUR_END,
} from "@/lib/business-leads/wave-schedule";
import { BRAND } from "@/lib/catalog";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

/**
 * ~1,8 s/mail → 50 ≈ 90 s. No subir a 100: Vercel corta la respuesta
 * y se pierden el JSON + bumpDayStats aunque los mails ya hayan salido.
 */
const MAX_PER_INVOKE = 50;
const MAX_CATCHUP_PER_INVOKE = 50;

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
    const prev = await getDayStats();
    const next = {
      date,
      sent: setSent,
      failed: prev.failed || 0,
      // Conserva split si ya existía; si no, deja cold=sent (migración)
      coldSent: prev.coldSent || prev.fuSent ? Math.min(setSent, prev.coldSent || 0) : setSent,
      fuSent: prev.coldSent || prev.fuSent ? Math.min(setSent, prev.fuSent || 0) : 0,
      waves: Math.max(prev.waves || 0, Math.ceil(setSent / NFC_LEADS_WAVE_MAX)),
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
    // dry/force: devolver cola+secuencia aunque el cupo del día esté cerrado
    if (dry || force) {
      const q = await loadQueue();
      const optSkip = await loadOptOut();
      return NextResponse.json({
        ok: true,
        stopped: true,
        reason: "daily_cap",
        day,
        sales,
        queue: queueCounts(q.leads),
        sequence: sequenceCounts(q.leads, optSkip),
        caps: {
          hard: NFC_LEADS_DAILY_HARD_CAP,
          cold: NFC_LEADS_COLD_DAILY_CAP,
          fu: NFC_LEADS_FU_DAILY_CAP,
        },
      });
    }
    return NextResponse.json({ ok: true, stopped: true, reason: "daily_cap", day, sales });
  }

  const windowGate = canSendThisHour({ hour, daySent: day.sent, force });
  if (!windowGate.ok) {
    const q = await loadQueue();
    const optSkip = await loadOptOut();
    return NextResponse.json({
      ok: true,
      skipped: true,
      reason: "outside_window",
      hourMadrid: hour,
      window: windowGate.window,
      day,
      sales,
      sequence: sequenceCounts(q.leads, optSkip),
      caps: {
        hard: NFC_LEADS_DAILY_HARD_CAP,
        cold: NFC_LEADS_COLD_DAILY_CAP,
        fu: NFC_LEADS_FU_DAILY_CAP,
      },
    });
  }

  const opt = await loadOptOut();
  const buyers = await paidUnicaEmailSet();
  let qFile = await loadQueue();

  // Mantener categorías al día: baja/compra + backfill + clicks/opens vencidos → due
  const synced = syncStopsOnLeads(qFile.leads, opt, buyers);
  let leads = synced.leads;
  const bf = backfillFollowUpSchedules(leads);
  leads = bf.leads;
  const promotedClicks = promoteOverdueClickFollowUps(leads);
  leads = promotedClicks.leads;
  const promotedOpens = promoteOverdueOpenFollowUps(leads);
  leads = promotedOpens.leads;
  qFile = { ...qFile, leads };
  const maintenance = {
    stoppedOpt: synced.stoppedOpt,
    stoppedSale: synced.stoppedSale,
    backfill: bf.updated,
    promotedClicks: promotedClicks.promoted,
    promotedOpens: promotedOpens.promoted,
  };
  if (
    !dry &&
    (synced.stoppedOpt ||
      synced.stoppedSale ||
      bf.updated ||
      promotedClicks.promoted ||
      promotedOpens.promoted)
  ) {
    await saveQueue(leads);
  }

  const qBefore = queueCounts(leads);
  let refill = null as {
    harvest?: Awaited<ReturnType<typeof harvestWebsitesIntoStock>>;
    extract?: Awaited<ReturnType<typeof extractEmailsFromStock>>;
  } | null;
  // Buffer anti-parada: si cola < mínimo, cosecha+extract a tope en la misma oleada
  if (!dry) {
    try {
      const stock = stockCounts((await loadWebsiteStock()).items);
      const starved =
        qBefore.queued < NFC_LEADS_MIN_QUEUED || stock.pending < NFC_LEADS_MIN_PENDING;
      const critical = qBefore.queued < 150;
      const needHarvest = starved;
      const harvestIdx = harvestProgressIndex(day.waves, hour, madridDate());
      const harvest = needHarvest
        ? await harvestWebsitesIntoStock({
            waveIndex: harvestIdx,
            maxCells: critical ? 14 : qBefore.queued < 300 ? 10 : 6,
            searchKeywords: critical ? 8 : qBefore.queued < 300 ? 5 : 3,
            targetPending: NFC_LEADS_TARGET_PENDING,
            enqueueOsmEmails: true,
          })
        : undefined;
      const pendingAfter = harvest?.stock?.pending ?? stock.pending;
      const extract =
        pendingAfter > 0 || qBefore.queued < NFC_LEADS_MIN_QUEUED
          ? await extractEmailsFromStock({
              maxPages: critical ? 55 : qBefore.queued < 300 ? 40 : 30,
              targetQueued: NFC_LEADS_TARGET_QUEUED,
            })
          : undefined;
      refill = { harvest, extract };
      if (extract?.added) {
        qFile = await loadQueue();
        leads = qFile.leads;
      }
    } catch (e) {
      console.error("refill", e);
      refill = {};
    }
  }

  const expected = expectedSentByNow(Math.min(hour, WAVE_HOUR_END));
  const behind = Math.max(0, expected - day.sent);
  const want = behind > 0 ? behind : NFC_LEADS_WAVE_MAX;
  const perInvoke =
    behind >= NFC_LEADS_WAVE_MAX * 2 || windowGate.mode === "catchup"
      ? MAX_CATCHUP_PER_INVOKE
      : MAX_PER_INVOKE;
  const room = Math.min(want, NFC_LEADS_DAILY_HARD_CAP - day.sent, perInvoke);

  const { coldSent: coldSentDay, fuSent: fuSentDay } = effectiveColdFu(day);
  const coldCandidates = (await takeQueued(room)).filter(
    (l) => !opt.has(l.email.toLowerCase()) && !buyers.has(l.email.toLowerCase()),
  );
  const planned = planWavePicks({
    leads,
    coldCandidates,
    optOut: opt,
    buyers,
    room,
    coldSentDay,
    fuSentDay,
    fillEarly: behind > 0 || windowGate.mode === "catchup",
  });
  const picks = planned.picks;
  const seq = sequenceCounts(leads, opt);

  if (dry) {
    return NextResponse.json({
      ok: true,
      dry: true,
      hourMadrid: hour,
      mode: windowGate.mode,
      expected,
      behind,
      room,
      perInvoke,
      plan: planned.meta,
      sales,
      day,
      caps: {
        hard: NFC_LEADS_DAILY_HARD_CAP,
        cold: NFC_LEADS_COLD_DAILY_CAP,
        fu: NFC_LEADS_FU_DAILY_CAP,
      },
      sequence: seq,
      maintenance,
      sample: picks.slice(0, 8).map((p) => ({
        touch: p.touch,
        city: p.lead.city,
        name: p.lead.businessName,
        email: p.lead.email.replace(/(^.).*(@.*$)/, "$1***$2"),
        nextTouchAt: p.lead.nextTouchAt,
      })),
      queue: queueCounts(leads),
      refill,
    });
  }

  if (!picks.length) {
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
        // Contador día al vuelo: si el invoke muere a mitad, no perdemos el cupo
        await bumpDayStats({
          sent: 1,
          coldSent: 1,
          place: lead.city || "cold",
          bumpWave: false,
        });
      } else {
        fuSent++;
        await markLead(lead.id, {
          resendId: r.id || undefined,
          ...patchAfterFollowUpSent(lead, touch, at),
        });
        await bumpDayStats({
          sent: 1,
          fuSent: 1,
          place: `FU · ${lead.city || "—"}`,
          bumpWave: false,
        });
      }
    } else {
      failed++;
      await markLead(lead.id, { status: "failed", error: r.error });
      await bumpDayStats({ failed: 1, place: "fail", bumpWave: false });
    }
    await new Promise((res) => setTimeout(res, NFC_LEADS_SEND_DELAY_MS));
  }

  for (const pick of picks) {
    await sendOne(pick.lead, pick.touch);
  }

  const place = [...cities].slice(0, 4).join(", ") || "—";
  // Cierre de oleada (+1 wave); los mails ya están contados
  const nextDay = await bumpDayStats({
    place: fuSent || coldSent ? `FU ${fuSent}+cold ${coldSent} · ${place}` : place,
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
    mode: windowGate.mode,
    expected,
    behind,
    plan: planned.meta,
    sent,
    failed,
    coldSent,
    fuSent,
    place,
    sales,
    day: nextDay,
    maintenance,
    sequence: sequenceCounts((await loadQueue()).leads, opt),
    refill,
    queue: queueCounts((await loadQueue()).leads),
  });
}
