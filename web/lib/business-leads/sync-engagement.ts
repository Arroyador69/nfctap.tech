/**
 * Backfill opens/clicks/bounces desde la API de Resend (como Delfín sync).
 * Sirve para mails ya enviados cuando el webhook no estaba conectado.
 * Respeta el rate limit de Resend (10 req/s) con pausa + retry 429.
 */

import { loadQueue, saveQueue, type BusinessLead } from "./queue";

type ResendListItem = {
  id: string;
  to?: string[] | string;
  created_at?: string;
  last_event?: string;
};

function resendKey() {
  return (process.env.RESEND_API_KEY || "").trim().replace(/^["']|["']$/g, "");
}

function toAddress(to: ResendListItem["to"]): string {
  if (Array.isArray(to)) return (to[0] || "").toLowerCase();
  return (to || "").toLowerCase();
}

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

function applyEvent(lead: BusinessLead, lastEvent: string, at: string): boolean {
  let changed = false;
  if (lastEvent === "opened" || lastEvent === "clicked") {
    if (!lead.openedAt) {
      lead.openedAt = at;
      changed = true;
    }
  }
  if (lastEvent === "clicked") {
    if (!lead.clickedAt) {
      lead.clickedAt = at;
      changed = true;
    }
  }
  if (lastEvent === "bounced" || lastEvent === "complained") {
    if (!lead.bouncedAt) {
      lead.bouncedAt = at;
      changed = true;
    }
    if (lead.status === "sent") {
      lead.status = "failed";
      changed = true;
    }
  }
  return changed;
}

async function fetchEmailsPage(
  key: string,
  after: string | undefined,
  attempt = 0,
): Promise<{ rows: ResendListItem[]; hasMore: boolean; error?: string }> {
  const qs = new URLSearchParams({ limit: "100" });
  if (after) qs.set("after", after);
  const res = await fetch(`https://api.resend.com/emails?${qs}`, {
    headers: { Authorization: `Bearer ${key}`, Accept: "application/json" },
    signal: AbortSignal.timeout(20_000),
  });
  if (res.status === 429 && attempt < 4) {
    const retryAfter = Number(res.headers.get("retry-after") || "") || 1 + attempt;
    await sleep(Math.max(1000, retryAfter * 1000));
    return fetchEmailsPage(key, after, attempt + 1);
  }
  if (!res.ok) {
    const msg = await res.text();
    return {
      rows: [],
      hasMore: false,
      error: msg.slice(0, 200) || `Resend HTTP ${res.status}`,
    };
  }
  const body = (await res.json()) as {
    data?: ResendListItem[];
    has_more?: boolean;
  };
  return { rows: body.data || [], hasMore: Boolean(body.has_more) };
}

/**
 * Lista emails recientes en Resend y marca opens/clicks en la cola.
 * maxPages: cada página ≤100 (Resend). Pausa ~200ms entre páginas.
 */
export async function syncEngagementFromResend(opts?: {
  maxPages?: number;
}): Promise<{
  ok: boolean;
  checked: number;
  updated: number;
  opened: number;
  clicked: number;
  bounced: number;
  withResendId: number;
  error?: string;
}> {
  const key = resendKey();
  if (!key) {
    return {
      ok: false,
      checked: 0,
      updated: 0,
      opened: 0,
      clicked: 0,
      bounced: 0,
      withResendId: 0,
      error: "Falta RESEND_API_KEY",
    };
  }

  const file = await loadQueue();
  const byId = new Map<string, number>();
  const byEmail = new Map<string, number>();
  file.leads.forEach((l, idx) => {
    if (l.resendId) byId.set(l.resendId, idx);
    if (l.status === "sent" && l.email) {
      const prev = byEmail.get(l.email);
      if (
        prev == null ||
        (l.sentAt || "") > (file.leads[prev].sentAt || "")
      ) {
        byEmail.set(l.email.toLowerCase(), idx);
      }
    }
  });

  const withResendId = byId.size;
  // Por defecto pocas páginas: evita 429 si hay otras llamadas a Resend.
  const maxPages = Math.min(Math.max(opts?.maxPages ?? 8, 1), 15);
  let after: string | undefined;
  let checked = 0;
  let updated = 0;
  let opened = 0;
  let clicked = 0;
  let bounced = 0;
  let lastError: string | undefined;

  for (let page = 0; page < maxPages; page++) {
    if (page > 0) await sleep(220); // < 5 req/s, margen bajo el límite 10/s
    const { rows, hasMore, error } = await fetchEmailsPage(key, after);
    if (error) {
      lastError = error;
      break;
    }
    if (!rows.length) break;

    for (const row of rows) {
      checked++;
      const idx =
        (row.id ? byId.get(row.id) : undefined) ??
        byEmail.get(toAddress(row.to));
      if (idx == null || idx === undefined) continue;
      const lead = file.leads[idx];
      if (!lead.resendId && row.id) lead.resendId = row.id;
      const at = row.created_at || new Date().toISOString();
      const ev = (row.last_event || "").toLowerCase();
      if (!ev) continue;
      const beforeOpened = Boolean(lead.openedAt);
      const beforeClicked = Boolean(lead.clickedAt);
      const beforeBounced = Boolean(lead.bouncedAt);
      if (applyEvent(lead, ev, at)) {
        updated++;
        if (!beforeOpened && lead.openedAt) opened++;
        if (!beforeClicked && lead.clickedAt) clicked++;
        if (!beforeBounced && lead.bouncedAt) bounced++;
      }
    }

    if (!hasMore) break;
    after = rows[rows.length - 1]?.id;
    if (!after) break;
  }

  if (updated > 0) await saveQueue(file.leads);

  return {
    ok: !lastError || updated > 0 || checked > 0,
    checked,
    updated,
    opened,
    clicked,
    bounced,
    withResendId,
    error: lastError,
  };
}
