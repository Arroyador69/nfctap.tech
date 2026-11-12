/**
 * Plan de oleada: llegar al hard cap (500) priorizando intención de compra.
 *
 * Orden fijo: FU click → FU open → cold → FU silencio.
 * Soft caps (350/150) son preferencia de reporting; no bloquean el hard.
 * Si no hay cold, FU (incl. silencio) completa el ritmo diario.
 */

import {
  NFC_LEADS_COLD_DAILY_CAP,
  NFC_LEADS_DAILY_HARD_CAP,
  NFC_LEADS_FU_DAILY_CAP,
} from "./constants";
import type { BusinessLead, TouchKind } from "./queue";
import {
  followUpPriority,
  isFollowUpDue,
  selectFollowUpFill,
} from "./sequence";

export type WavePick = { lead: BusinessLead; touch: TouchKind };

function usable(lead: BusinessLead, optOut: Set<string>, buyers: Set<string>) {
  const email = lead.email.toLowerCase();
  return !optOut.has(email) && !buyers.has(email);
}

function dueByTier(
  leads: BusinessLead[],
  optOut: Set<string>,
  buyers: Set<string>,
  tier: 0 | 1 | 2,
  now: Date,
) {
  return leads
    .filter(
      (l) =>
        usable(l, optOut, buyers) &&
        isFollowUpDue(l, now) &&
        followUpPriority(l) === tier,
    )
    .sort((a, b) => (a.nextTouchAt || "").localeCompare(b.nextTouchAt || ""));
}

export function planWavePicks(opts: {
  leads: BusinessLead[];
  coldCandidates: BusinessLead[];
  optOut: Set<string>;
  buyers: Set<string>;
  room: number;
  coldSentDay: number;
  fuSentDay: number;
  /** Si el día va por debajo del ritmo, adelanta FU programados. */
  fillEarly?: boolean;
  now?: Date;
}): {
  picks: WavePick[];
  meta: {
    click: number;
    open: number;
    silent: number;
    cold: number;
    pulledEarly: number;
    softFuLeft: number;
    softColdLeft: number;
  };
} {
  const now = opts.now || new Date();
  const room = Math.max(0, Math.floor(opts.room));
  const picks: WavePick[] = [];
  const used = new Set<string>();

  const push = (lead: BusinessLead, touch: TouchKind) => {
    if (picks.length >= room) return false;
    if (used.has(lead.id)) return false;
    used.add(lead.id);
    picks.push({ lead, touch });
    return true;
  };

  const clicks = dueByTier(opts.leads, opts.optOut, opts.buyers, 0, now);
  const opens = dueByTier(opts.leads, opts.optOut, opts.buyers, 1, now);
  const silents = dueByTier(opts.leads, opts.optOut, opts.buyers, 2, now);
  const colds = opts.coldCandidates.filter((l) => usable(l, opts.optOut, opts.buyers));

  for (const lead of clicks) {
    push(lead, (lead.nextTouchKind as TouchKind) || "fu_click");
  }
  for (const lead of opens) {
    push(lead, (lead.nextTouchKind as TouchKind) || "fu_open");
  }
  for (const lead of colds) {
    push(lead, "cold");
  }
  for (const lead of silents) {
    push(lead, (lead.nextTouchKind as TouchKind) || "fu_silent");
  }

  // Si el día va corto y faltan huecos: adelantar FU programados (intención primero)
  let pulledEarly = 0;
  if (opts.fillEarly && picks.length < room) {
    const fill = selectFollowUpFill(
      opts.leads,
      room - picks.length,
      opts.optOut,
      used,
      now,
    );
    for (const lead of fill) {
      const touch = (lead.nextTouchKind as TouchKind) || "fu_silent";
      if (push(lead, touch)) pulledEarly++;
    }
  }

  return {
    picks,
    meta: {
      click: picks.filter((p) => p.touch === "fu_click").length,
      open: picks.filter((p) => p.touch === "fu_open").length,
      silent: picks.filter((p) => p.touch === "fu_silent").length,
      cold: picks.filter((p) => p.touch === "cold").length,
      pulledEarly,
      softFuLeft: Math.max(0, NFC_LEADS_FU_DAILY_CAP - opts.fuSentDay),
      softColdLeft: Math.max(0, NFC_LEADS_COLD_DAILY_CAP - opts.coldSentDay),
    },
  };
}

/** Índice de cosecha que avanza cada día/hora (no se queda en Fuengirola). */
export function harvestProgressIndex(dayWaves: number, hourMadrid: number, dateKey: string) {
  const dayNum = Math.floor(new Date(`${dateKey}T12:00:00Z`).getTime() / 86_400_000);
  return Math.abs(dayNum * 37 + hourMadrid * 19 + dayWaves * 11);
}

export function hardCapLeft(daySent: number) {
  return Math.max(0, NFC_LEADS_DAILY_HARD_CAP - daySent);
}
