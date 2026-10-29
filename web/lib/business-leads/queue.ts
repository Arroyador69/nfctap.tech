/**
 * Cola de leads en Vercel Blob (private, como el store de pedidos).
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
    const { list } = await import("@vercel/blob");
    const { blobs } = await list({ prefix: key, limit: 8 });
    const hit =
      blobs.find((b) => b.pathname === key) ||
      blobs.find((b) => b.pathname.endsWith(key)) ||
      blobs[0];
    if (!hit) return fallback;
    const res = await fetch(hit.url);
    if (!res.ok) return fallback;
    return (await res.json()) as T;
  } catch (e) {
    console.error("queue read", key, e);
    return fallback;
  }
}

async function writeJson(key: string, data: unknown) {
  if (!blobOk()) {
    throw new Error("Falta BLOB_READ_WRITE_TOKEN");
  }
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
  // verificar
  const check = await loadQueue();
  if (check.leads.length < leads.length) {
    console.error("queue persist mismatch", { wrote: leads.length, read: check.leads.length });
  }
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
  return { total: leads.length, queued, sent, failed };
}

export async function enqueueLeads(
  incoming: Omit<BusinessLead, "id" | "status" | "createdAt">[],
): Promise<{ added: number; skipped: number; queued: number }> {
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
  return { added, skipped, queued: queueCounts(verified.leads).queued };
}

export async function takeQueued(n: number): Promise<BusinessLead[]> {
  const file = await loadQueue();
  return file.leads.filter((l) => l.status === "queued").slice(0, Math.max(0, n));
}

export async function markLead(
  id: string,
  patch: Partial<Pick<BusinessLead, "status" | "sentAt" | "error">>,
) {
  const file = await loadQueue();
  const i = file.leads.findIndex((l) => l.id === id);
  if (i < 0) return;
  file.leads[i] = { ...file.leads[i], ...patch };
  await saveQueue(file.leads);
}
