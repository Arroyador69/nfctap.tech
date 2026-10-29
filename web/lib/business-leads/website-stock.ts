/**
 * Stock de webs pendientes de scrapear email (fase A del flujo).
 * Separado de la cola de envío: así harvest puede ser agresivo sin timeout.
 */

import { domainFromUrl, isBlockedOutreachHost } from "./blocked-hosts";
import { normalizeUrl } from "./emails";

export type WebsiteSource = {
  url: string;
  domain: string;
  name: string;
  city: string;
  kind: string; // amenity/shop/tourism/…
  status: "pending" | "done" | "failed" | "no_email";
  source: "osm_map" | "nominatim" | "photon" | "manual";
  createdAt: string;
  doneAt?: string;
  lastError?: string;
};

const STOCK_KEY = "nfctap-website-stock.json";

type StockFile = { items: WebsiteSource[]; updatedAt: string };

function blobOk() {
  return Boolean(process.env.BLOB_READ_WRITE_TOKEN);
}

async function readStock(): Promise<StockFile> {
  if (!blobOk()) return { items: [], updatedAt: "" };
  try {
    const { get } = await import("@vercel/blob");
    const result = await get(STOCK_KEY, { access: "private", useCache: false });
    if (!result || result.statusCode !== 200 || !result.stream) {
      return { items: [], updatedAt: "" };
    }
    const text = await new Response(result.stream).text();
    if (!text) return { items: [], updatedAt: "" };
    return JSON.parse(text) as StockFile;
  } catch {
    return { items: [], updatedAt: "" };
  }
}

async function writeStock(items: WebsiteSource[]) {
  if (!blobOk()) throw new Error("Falta BLOB_READ_WRITE_TOKEN");
  const { put } = await import("@vercel/blob");
  const file: StockFile = { items, updatedAt: new Date().toISOString() };
  await put(STOCK_KEY, JSON.stringify(file), {
    access: "private",
    addRandomSuffix: false,
    allowOverwrite: true,
    contentType: "application/json",
  });
}

export function stockCounts(items: WebsiteSource[]) {
  const pending = items.filter((i) => i.status === "pending").length;
  const done = items.filter((i) => i.status === "done").length;
  const noEmail = items.filter((i) => i.status === "no_email").length;
  const failed = items.filter((i) => i.status === "failed").length;
  return { total: items.length, pending, done, noEmail, failed };
}

export async function loadWebsiteStock() {
  return readStock();
}

export async function addWebsiteSources(
  incoming: Array<{
    url: string;
    name: string;
    city: string;
    kind?: string;
    source?: WebsiteSource["source"];
  }>,
): Promise<{ added: number; skipped: number; pending: number }> {
  const file = await readStock();
  const seen = new Set(file.items.map((i) => i.domain));
  let added = 0;
  let skipped = 0;
  for (const row of incoming) {
    const url = normalizeUrl(row.url);
    if (!url || isBlockedOutreachHost(url)) {
      skipped++;
      continue;
    }
    const domain = domainFromUrl(url);
    if (!domain || seen.has(domain)) {
      skipped++;
      continue;
    }
    seen.add(domain);
    file.items.push({
      url,
      domain,
      name: (row.name || "Negocio local").slice(0, 80),
      city: row.city || "",
      kind: row.kind || "business",
      status: "pending",
      source: row.source || "osm_map",
      createdAt: new Date().toISOString(),
    });
    added++;
  }
  if (added > 0) await writeStock(file.items);
  return { added, skipped, pending: stockCounts(file.items).pending };
}

export async function takePendingWebsites(n: number): Promise<WebsiteSource[]> {
  const file = await readStock();
  return file.items.filter((i) => i.status === "pending").slice(0, Math.max(0, n));
}

export async function markWebsite(
  domain: string,
  patch: Partial<Pick<WebsiteSource, "status" | "doneAt" | "lastError">>,
) {
  const file = await readStock();
  const i = file.items.findIndex((x) => x.domain === domain);
  if (i < 0) return;
  file.items[i] = { ...file.items[i], ...patch };
  await writeStock(file.items);
}

export async function markWebsitesBulk(
  updates: Array<{ domain: string; status: WebsiteSource["status"]; lastError?: string }>,
) {
  if (!updates.length) return;
  const file = await readStock();
  const map = new Map(updates.map((u) => [u.domain, u]));
  let changed = false;
  for (let i = 0; i < file.items.length; i++) {
    const u = map.get(file.items[i].domain);
    if (!u) continue;
    file.items[i] = {
      ...file.items[i],
      status: u.status,
      doneAt: new Date().toISOString(),
      lastError: u.lastError,
    };
    changed = true;
  }
  if (changed) await writeStock(file.items);
}
