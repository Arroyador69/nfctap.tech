/**
 * Secuencia cold → follow-up por intención (click > open > silencio).
 * Reutilizable conceptualmente en Delfín (mismos tiers / stops).
 */

import {
  NFC_FU_CLICK_DELAY_DAYS,
  NFC_FU_CLICK_SECOND_DELAY_DAYS,
  NFC_FU_MAX_TOUCHES_CLICK,
  NFC_FU_MAX_TOUCHES_OPEN,
  NFC_FU_MAX_TOUCHES_SILENT,
  NFC_FU_OPEN_DELAY_DAYS,
  NFC_FU_SILENT_DELAY_DAYS,
} from "./constants";
import type { BusinessLead, SequenceStatus, TouchKind } from "./queue";

export function addDaysIso(fromIso: string | Date, days: number): string {
  const d = fromIso instanceof Date ? new Date(fromIso.getTime()) : new Date(fromIso);
  d.setTime(d.getTime() + days * 86_400_000);
  return d.toISOString();
}

export function isSequenceActive(lead: BusinessLead): boolean {
  const st = lead.sequenceStatus || "active";
  if (st !== "active") return false;
  if (lead.status === "optout" || lead.status === "failed") return false;
  if (lead.bouncedAt) return false;
  return true;
}

/** Prioridad de envío FU: menor = antes (A click, B open, C silent). */
export function followUpPriority(lead: BusinessLead): number {
  const kind = lead.nextTouchKind;
  if (kind === "fu_click") return 0;
  if (kind === "fu_open") return 1;
  if (kind === "fu_silent") return 2;
  if (lead.clickedAt) return 0;
  if (lead.openedAt) return 1;
  return 2;
}

export function isFollowUpDue(lead: BusinessLead, now = new Date()): boolean {
  if (!isSequenceActive(lead)) return false;
  if (lead.status !== "sent") return false;
  const kind = lead.nextTouchKind;
  if (!kind || kind === "cold") return false;
  if (!lead.nextTouchAt) return false;
  const touches = lead.touchCount || 1;
  const max =
    kind === "fu_click"
      ? NFC_FU_MAX_TOUCHES_CLICK
      : kind === "fu_open"
        ? NFC_FU_MAX_TOUCHES_OPEN
        : NFC_FU_MAX_TOUCHES_SILENT;
  if (touches >= max) return false;
  return new Date(lead.nextTouchAt).getTime() <= now.getTime();
}

/** Tras cold OK. */
export function patchAfterColdSend(at = new Date().toISOString()): Partial<BusinessLead> {
  return {
    touchCount: 1,
    lastTouchAt: at,
    lastTouchKind: "cold",
    sequenceStatus: "active",
    // Candidato silencio; open/click lo adelantan
    nextTouchAt: addDaysIso(at, NFC_FU_SILENT_DELAY_DAYS),
    nextTouchKind: "fu_silent",
  };
}

/** Open: programa FU-B si aún no hay click ni FU click pendiente. */
export function patchAfterOpened(lead: BusinessLead, at: string): Partial<BusinessLead> {
  if (
    lead.sequenceStatus === "stopped_sale" ||
    lead.sequenceStatus === "stopped_optout" ||
    lead.sequenceStatus === "stopped_bounce"
  ) {
    return {};
  }
  if (lead.clickedAt || lead.nextTouchKind === "fu_click") return {};
  // Ya programado FU open — no pisar en cada sync/webhook
  if (lead.nextTouchKind === "fu_open" && lead.nextTouchAt) return {};
  const touches = lead.touchCount || 1;
  if (touches >= NFC_FU_MAX_TOUCHES_OPEN) return {};
  const base = lead.sentAt || at;
  const due = addDaysIso(base, NFC_FU_OPEN_DELAY_DAYS);
  const next = new Date(due).getTime() < Date.now() ? new Date().toISOString() : due;
  return {
    nextTouchAt: next,
    nextTouchKind: "fu_open",
    sequenceStatus: "active",
  };
}

/** Click: máxima prioridad FU-A. */
export function patchAfterClicked(lead: BusinessLead, at: string): Partial<BusinessLead> {
  if (
    lead.sequenceStatus === "stopped_sale" ||
    lead.sequenceStatus === "stopped_optout" ||
    lead.sequenceStatus === "stopped_bounce"
  ) {
    return {};
  }
  const touches = lead.touchCount || 1;
  if (touches >= NFC_FU_MAX_TOUCHES_CLICK) {
    return { sequenceStatus: "exhausted", nextTouchAt: undefined, nextTouchKind: undefined };
  }
  // Ya en cola FU click — no retrasar con otro webhook
  if (lead.nextTouchKind === "fu_click" && lead.nextTouchAt) return {};
  const due = addDaysIso(at, NFC_FU_CLICK_DELAY_DAYS);
  const next = new Date(due).getTime() < Date.now() ? new Date().toISOString() : due;
  return {
    nextTouchAt: next,
    nextTouchKind: "fu_click",
    sequenceStatus: "active",
  };
}

export function patchAfterBounce(): Partial<BusinessLead> {
  return {
    sequenceStatus: "stopped_bounce",
    nextTouchAt: undefined,
    nextTouchKind: undefined,
  };
}

export function patchAfterOptOut(): Partial<BusinessLead> {
  return {
    status: "optout",
    sequenceStatus: "stopped_optout",
    nextTouchAt: undefined,
    nextTouchKind: undefined,
  };
}

export function patchAfterSale(): Partial<BusinessLead> {
  return {
    sequenceStatus: "stopped_sale",
    nextTouchAt: undefined,
    nextTouchKind: undefined,
  };
}

/** Tras enviar un follow-up: agendar siguiente o cerrar. */
export function patchAfterFollowUpSent(
  lead: BusinessLead,
  kind: TouchKind,
  at = new Date().toISOString(),
): Partial<BusinessLead> {
  const touches = (lead.touchCount || 1) + 1;
  const base: Partial<BusinessLead> = {
    touchCount: touches,
    lastTouchAt: at,
    lastTouchKind: kind,
    status: "sent",
    sentAt: lead.sentAt || at,
  };

  if (kind === "fu_click" && touches < NFC_FU_MAX_TOUCHES_CLICK) {
    return {
      ...base,
      nextTouchAt: addDaysIso(at, NFC_FU_CLICK_SECOND_DELAY_DAYS),
      nextTouchKind: "fu_click",
      sequenceStatus: "active",
    };
  }

  return {
    ...base,
    nextTouchAt: undefined,
    nextTouchKind: undefined,
    sequenceStatus: "exhausted",
  };
}

export function selectFollowUpDue(
  leads: BusinessLead[],
  n: number,
  optOut: Set<string>,
  now = new Date(),
): BusinessLead[] {
  return leads
    .filter((l) => !optOut.has(l.email.toLowerCase()) && isFollowUpDue(l, now))
    .sort((a, b) => {
      const p = followUpPriority(a) - followUpPriority(b);
      if (p !== 0) return p;
      return (a.nextTouchAt || "").localeCompare(b.nextTouchAt || "");
    })
    .slice(0, Math.max(0, n));
}

/**
 * Cierra secuencias de emails en baja / compradores (histórico sin patch).
 * Sin esto el panel marca «due» leads que el envío salta por opt-out.
 */
export function syncStopsOnLeads(
  leads: BusinessLead[],
  optOut: Set<string>,
  buyers: Set<string>,
): { leads: BusinessLead[]; stoppedOpt: number; stoppedSale: number } {
  let stoppedOpt = 0;
  let stoppedSale = 0;
  const next = leads.map((lead) => {
    const email = lead.email.toLowerCase();
    if (buyers.has(email) && lead.sequenceStatus !== "stopped_sale") {
      stoppedSale++;
      return { ...lead, ...patchAfterSale() };
    }
    if (optOut.has(email) && lead.sequenceStatus !== "stopped_optout") {
      stoppedOpt++;
      return { ...lead, ...patchAfterOptOut() };
    }
    return lead;
  });
  return { leads: next, stoppedOpt, stoppedSale };
}

/**
 * Clicks antiguos sin FU enviado → due ahora (sistema no se queda mirando).
 */
export function promoteOverdueClickFollowUps(
  leads: BusinessLead[],
  now = Date.now(),
): { leads: BusinessLead[]; promoted: number } {
  let promoted = 0;
  const out = leads.map((lead) => {
    if (lead.status !== "sent" || !lead.clickedAt) return lead;
    if (!isSequenceActive(lead)) return lead;
    const touches = lead.touchCount || 1;
    if (touches >= NFC_FU_MAX_TOUCHES_CLICK) return lead;
    if (touches > 1 && lead.lastTouchKind && lead.lastTouchKind !== "cold") return lead;
    const clickAge = now - new Date(lead.clickedAt).getTime();
    if (clickAge < NFC_FU_CLICK_DELAY_DAYS * 86_400_000) return lead;
    const dueAt = lead.nextTouchAt ? new Date(lead.nextTouchAt).getTime() : Infinity;
    if (lead.nextTouchKind === "fu_click" && dueAt <= now) return lead;
    promoted++;
    return {
      ...lead,
      nextTouchKind: "fu_click" as const,
      nextTouchAt: new Date().toISOString(),
      sequenceStatus: "active" as const,
      touchCount: touches || 1,
    };
  });
  return { leads: out, promoted };
}

/**
 * Programa FU para leads ya enviados (backfill one-shot).
 * Clicks → ya; opens →; silencio → +8d desde sent (o ahora si vencido).
 */
export function backfillFollowUpSchedules(leads: BusinessLead[]): {
  leads: BusinessLead[];
  updated: number;
  tiers: { click: number; open: number; silent: number };
} {
  let updated = 0;
  const tiers = { click: 0, open: 0, silent: 0 };
  const now = Date.now();
  const out = leads.map((lead) => {
    if (lead.status !== "sent") return lead;
    if (lead.bouncedAt) {
      if (lead.sequenceStatus === "stopped_bounce") return lead;
      updated++;
      return { ...lead, ...patchAfterBounce() };
    }
    if (lead.sequenceStatus === "stopped_sale" || lead.sequenceStatus === "stopped_optout") {
      return lead;
    }
    // Ya tiene FU pendiente coherente
    if (lead.nextTouchKind && lead.nextTouchKind !== "cold" && lead.nextTouchAt) {
      return lead;
    }
    if ((lead.touchCount || 1) > 1 && lead.sequenceStatus === "exhausted") return lead;

    let patch: Partial<BusinessLead> = {
      touchCount: lead.touchCount || 1,
      lastTouchKind: lead.lastTouchKind || "cold",
      lastTouchAt: lead.lastTouchAt || lead.sentAt,
      sequenceStatus: "active",
    };

    if (lead.clickedAt) {
      const due = addDaysIso(lead.clickedAt, NFC_FU_CLICK_DELAY_DAYS);
      patch = {
        ...patch,
        nextTouchKind: "fu_click",
        nextTouchAt: new Date(due).getTime() < now ? new Date().toISOString() : due,
      };
      tiers.click++;
    } else if (lead.openedAt) {
      const base = lead.sentAt || lead.openedAt;
      const due = addDaysIso(base, NFC_FU_OPEN_DELAY_DAYS);
      patch = {
        ...patch,
        nextTouchKind: "fu_open",
        nextTouchAt: new Date(due).getTime() < now ? new Date().toISOString() : due,
      };
      tiers.open++;
    } else if (lead.sentAt) {
      const due = addDaysIso(lead.sentAt, NFC_FU_SILENT_DELAY_DAYS);
      patch = {
        ...patch,
        nextTouchKind: "fu_silent",
        nextTouchAt: new Date(due).getTime() < now ? new Date().toISOString() : due,
      };
      tiers.silent++;
    } else {
      return lead;
    }
    updated++;
    return { ...lead, ...patch };
  });
  return { leads: out, updated, tiers };
}

export function sequenceCounts(leads: BusinessLead[], optOut?: Set<string>) {
  const sendable = (l: BusinessLead) =>
    !optOut?.has(l.email.toLowerCase()) && isFollowUpDue(l);
  const due = leads.filter(sendable);
  const scheduled = leads.filter(
    (l) =>
      isSequenceActive(l) &&
      l.status === "sent" &&
      !optOut?.has(l.email.toLowerCase()) &&
      l.nextTouchKind &&
      l.nextTouchKind !== "cold" &&
      l.nextTouchAt,
  );
  return {
    dueTotal: due.length,
    dueClick: due.filter((l) => followUpPriority(l) === 0).length,
    dueOpen: due.filter((l) => followUpPriority(l) === 1).length,
    dueSilent: due.filter((l) => followUpPriority(l) === 2).length,
    scheduledClick: scheduled.filter((l) => l.nextTouchKind === "fu_click").length,
    scheduledOpen: scheduled.filter((l) => l.nextTouchKind === "fu_open").length,
    scheduledSilent: scheduled.filter((l) => l.nextTouchKind === "fu_silent").length,
    active: leads.filter((l) => isSequenceActive(l) && l.status === "sent").length,
    stoppedSale: leads.filter((l) => l.sequenceStatus === "stopped_sale").length,
    stoppedOptout: leads.filter((l) => l.sequenceStatus === "stopped_optout").length,
    exhausted: leads.filter((l) => l.sequenceStatus === "exhausted").length,
    fuSentEver: leads.filter(
      (l) => l.lastTouchKind && l.lastTouchKind !== "cold" && (l.touchCount || 0) > 1,
    ).length,
  };
}

export function stopStatusFor(reason: "sale" | "optout" | "bounce"): SequenceStatus {
  if (reason === "sale") return "stopped_sale";
  if (reason === "optout") return "stopped_optout";
  return "stopped_bounce";
}
