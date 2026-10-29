/**
 * Fase B — scrapea emails de webs pendientes del stock → cola de envío.
 */

import { extractEmailsFromText, isPlausiblePublicEmail, normalizeEmail } from "./emails";
import { enqueueLeads, loadQueue, queueCounts } from "./queue";
import {
  markWebsitesBulk,
  takePendingWebsites,
  type WebsiteSource,
} from "./website-stock";

const UA =
  "NFCTapExtract/1.0 (+https://nfctap.tech; email-extract; contact=contacto@nfctap.tech)";

async function emailFromWebsite(url: string): Promise<string> {
  try {
    const res = await fetch(url, {
      headers: { "User-Agent": UA, Accept: "text/html,application/xhtml+xml" },
      signal: AbortSignal.timeout(6_000),
      redirect: "follow",
    });
    if (!res.ok) return "";
    const html = (await res.text()).slice(0, 140_000);
    const found = extractEmailsFromText(html);
    if (found[0]) return found[0];

    // Un salto a /contacto si la home no trae mail
    const base = url.replace(/\/$/, "");
    for (const path of ["/contacto", "/contact", "/contactanos"]) {
      try {
        const r2 = await fetch(base + path, {
          headers: { "User-Agent": UA, Accept: "text/html" },
          signal: AbortSignal.timeout(4_500),
          redirect: "follow",
        });
        if (!r2.ok) continue;
        const e = extractEmailsFromText((await r2.text()).slice(0, 100_000))[0];
        if (e) return e;
      } catch {
        /* next */
      }
    }
    return "";
  } catch {
    return "";
  }
}

export type ExtractResult = {
  tried: number;
  withEmail: number;
  added: number;
  skipped: number;
  noEmail: number;
  failed: number;
  queued: number;
};

export async function extractEmailsFromStock(opts?: {
  maxPages?: number;
  targetQueued?: number;
}): Promise<ExtractResult> {
  const maxPages = opts?.maxPages ?? 40;
  const targetQueued = opts?.targetQueued ?? 1000;
  const queuedNow = queueCounts((await loadQueue()).leads).queued;
  if (queuedNow >= targetQueued) {
    return {
      tried: 0,
      withEmail: 0,
      added: 0,
      skipped: 0,
      noEmail: 0,
      failed: 0,
      queued: queuedNow,
    };
  }

  const pending = await takePendingWebsites(maxPages);
  const batch: Parameters<typeof enqueueLeads>[0] = [];
  const updates: Array<{
    domain: string;
    status: WebsiteSource["status"];
    lastError?: string;
  }> = [];
  let withEmail = 0;
  let noEmail = 0;
  let failed = 0;
  const deadline = Date.now() + 150_000;

  for (const site of pending) {
    if (Date.now() > deadline) break;
    const email = await emailFromWebsite(site.url);
    if (!email) {
      noEmail++;
      updates.push({ domain: site.domain, status: "no_email" });
      await new Promise((r) => setTimeout(r, 60));
      continue;
    }
    const e = normalizeEmail(email);
    if (!isPlausiblePublicEmail(e)) {
      failed++;
      updates.push({ domain: site.domain, status: "failed", lastError: "email_invalid" });
      continue;
    }
    withEmail++;
    updates.push({ domain: site.domain, status: "done" });
    batch.push({
      email: e,
      businessName: site.name,
      city: site.city || "España",
      websiteUrl: site.url,
      source: "web",
    });
    await new Promise((r) => setTimeout(r, 80));
  }

  await markWebsitesBulk(updates);
  const { added, skipped, queued } = await enqueueLeads(batch);
  return {
    tried: pending.length,
    withEmail,
    added,
    skipped,
    noEmail,
    failed,
    queued,
  };
}
