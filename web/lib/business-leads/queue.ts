/**
 * Cola + historial de leads en Vercel Blob (get/put private).
 */

export type BusinessLead = {
  id: string;
  email: string;
  businessName: string;
  city: string;
  websiteUrl?: string;
  source: "osm" | "web" | "manual";
  status: "queued" | "sent" | "failed" | "optout";
  createdAt: string;
  sentAt?: string;
  /** id Resend (email_…) para webhooks open/click/bounce */
  resendId?: string;
  openedAt?: string;
  clickedAt?: string;
  bouncedAt?: string;
  error?: string;
};

const QUEUE_KEY = "nfctap-business-leads-queue.json";
const OPT_OUT_KEY = "nfctap-opt-out-emails.json";

type QueueFile = { leads: BusinessLead[]; updatedAt: string };

function blobOk() {
  return Boolean(process.env.BLOB_READ_WRITE_TOKEN);
}

async function readJson<T>(key: string, fallback: T): Promise<T> {
  if (!blobOk()) return fallback;
  try {
    const { get } = await import("@vercel/blob");
    const result = await get(key, { access: "private", useCache: false });
    if (!result || result.statusCode !== 200 || !result.stream) return fallback;
    const text = await new Response(result.stream).text();
    if (!text) return fallback;
    return JSON.parse(text) as T;
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    if (!/not found|404/i.test(msg)) console.error("queue read", key, msg.slice(0, 200));
    return fallback;
  }
}

async function writeJson(key: string, data: unknown) {
  if (!blobOk()) throw new Error("Falta BLOB_READ_WRITE_TOKEN");
  const { put } = await import("@vercel/blob");
  await put(key, JSON.stringify(data), {
    access: "private",
    addRandomSuffix: false,
    allowOverwrite: true,
    contentType: "application/json",
  });
}

export async function loadQueue(): Promise<QueueFile> {
  return readJson<QueueFile>(QUEUE_KEY, { leads: [], updatedAt: "" });
}

export async function saveQueue(leads: BusinessLead[]) {
  const file: QueueFile = { leads, updatedAt: new Date().toISOString() };
  await writeJson(QUEUE_KEY, file);
  return file;
}

export async function loadOptOut(): Promise<Set<string>> {
  const data = await readJson<{ emails: string[] }>(OPT_OUT_KEY, { emails: [] });
  return new Set((data.emails || []).map((e) => e.toLowerCase()));
}

export async function addOptOut(email: string) {
  const set = await loadOptOut();
  set.add(email.toLowerCase());
  await writeJson(OPT_OUT_KEY, { emails: [...set], updatedAt: new Date().toISOString() });
}

export function queueCounts(leads: BusinessLead[]) {
  const queued = leads.filter((l) => l.status === "queued").length;
  const sent = leads.filter((l) => l.status === "sent").length;
  const failed = leads.filter((l) => l.status === "failed").length;
  const opened = leads.filter((l) => Boolean(l.openedAt)).length;
  const clicked = leads.filter((l) => Boolean(l.clickedAt)).length;
  const bounced = leads.filter((l) => Boolean(l.bouncedAt)).length;
  return { total: leads.length, queued, sent, failed, opened, clicked, bounced };
}

export function madridDayKey(iso?: string) {
  const d = iso ? new Date(iso) : new Date();
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Madrid",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(d);
}

/** Métricas de hoy (Madrid) desde la cola. */
export function todayEngagement(leads: BusinessLead[]) {
  const day = madridDayKey();
  const sentToday = leads.filter(
    (l) => l.status === "sent" && l.sentAt && madridDayKey(l.sentAt) === day,
  );
  const openedToday = sentToday.filter((l) => l.openedAt).length;
  const clickedToday = sentToday.filter((l) => l.clickedAt).length;
  const bouncedToday = sentToday.filter((l) => l.bouncedAt).length;
  const discoveredToday = leads.filter((l) => madridDayKey(l.createdAt) === day).length;
  return {
    sentToday: sentToday.length,
    openedToday,
    clickedToday,
    bouncedToday,
    discoveredToday,
    openRatePct:
      sentToday.length > 0 ? Math.round((openedToday / sentToday.length) * 100) : 0,
  };
}

export async function enqueueLeads(
  incoming: Omit<BusinessLead, "id" | "status" | "createdAt">[],
): Promise<{ added: number; skipped: number; queued: number; persistOk: boolean }> {
  const file = await loadQueue();
  const opt = await loadOptOut();
  const seen = new Set(file.leads.map((l) => l.email.toLowerCase()));
  let added = 0;
  let skipped = 0;
  for (const row of incoming) {
    const email = row.email.toLowerCase().trim();
    if (!email.includes("@") || seen.has(email) || opt.has(email)) {
      skipped++;
      continue;
    }
    seen.add(email);
    file.leads.push({
      ...row,
      email,
      id: `bl_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`,
      status: "queued",
      createdAt: new Date().toISOString(),
    });
    added++;
  }
  await saveQueue(file.leads);
  const verified = await loadQueue();
  return {
    added,
    skipped,
    queued: queueCounts(verified.leads).queued,
    persistOk: verified.leads.length >= file.leads.length,
  };
}

export async function takeQueued(n: number): Promise<BusinessLead[]> {
  const file = await loadQueue();
  return file.leads.filter((l) => l.status === "queued").slice(0, Math.max(0, n));
}

export type LeadPatch = Partial<
  Pick<
    BusinessLead,
    "status" | "sentAt" | "error" | "resendId" | "openedAt" | "clickedAt" | "bouncedAt"
  >
>;

export async function markLead(id: string, patch: LeadPatch) {
  const file = await loadQueue();
  const i = file.leads.findIndex((l) => l.id === id);
  if (i < 0) return;
  file.leads[i] = { ...file.leads[i], ...patch };
  await saveQueue(file.leads);
}

/** Actualiza por resendId (webhooks). Fallback: último enviado a ese email. */
export async function markLeadByResendId(
  resendId: string,
  patch: LeadPatch,
  toEmail?: string,
) {
  const file = await loadQueue();
  let i = resendId ? file.leads.findIndex((l) => l.resendId === resendId) : -1;
  if (i < 0 && toEmail) {
    const want = toEmail.toLowerCase();
    const candidates = file.leads
      .map((l, idx) => ({ l, idx }))
      .filter(({ l }) => l.email === want && l.status === "sent")
      .sort((a, b) => (b.l.sentAt || "").localeCompare(a.l.sentAt || ""));
    if (candidates[0]) i = candidates[0].idx;
  }
  if (i < 0) return false;
  const cur = file.leads[i];
  file.leads[i] = {
    ...cur,
    ...patch,
    resendId: patch.resendId || cur.resendId || resendId || undefined,
    openedAt: patch.openedAt || cur.openedAt,
    clickedAt: patch.clickedAt || cur.clickedAt,
    bouncedAt: patch.bouncedAt || cur.bouncedAt,
  };
  await saveQueue(file.leads);
  return true;
}

export function recentSent(leads: BusinessLead[], limit = 40) {
  return leads
    .filter((l) => l.status === "sent" && l.sentAt)
    .sort((a, b) => (b.sentAt || "").localeCompare(a.sentAt || ""))
    .slice(0, limit);
}
