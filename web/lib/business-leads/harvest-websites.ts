/**
 * Fase A — cosecha webs + emails OSM de CUALQUIER negocio.
 *
 * 1) OSM Map API por celdas (anillos Fuengirola → Costa → ES)
 * 2) Nominatim por ciudad × keyword
 *
 * Emails ya en OSM/Nominatim → cola de envío directa.
 * Webs sin email → stock para extract.
 */

import { isBlockedOutreachHost } from "./blocked-hosts";
import {
  isPlausiblePublicEmail,
  normalizeEmail,
  normalizeUrl,
} from "./emails";
import { harvestCellsForWave, type HarvestCell } from "./place-rings";
import { enqueueLeads, loadQueue, queueCounts } from "./queue";
import { addWebsiteSources, loadWebsiteStock, stockCounts } from "./website-stock";

const UA =
  "NFCTapHarvest/1.0 (+https://nfctap.tech; website-harvest; contact=contacto@nfctap.tech)";

export const BUSINESS_KEYWORDS = [
  "restaurante",
  "café",
  "bar",
  "peluquería",
  "clínica dental",
  "hotel",
  "apartamento turístico",
  "farmacia",
  "tienda",
  "gimnasio",
  "spa",
  "taller",
  "abogados",
  "inmobiliaria",
] as const;

type Hit = {
  url: string;
  email: string;
  name: string;
  city: string;
  kind: string;
};

function tagVal(chunk: string, key: string): string {
  const re = new RegExp(
    `k="${key.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}"\\s+v="([^"]*)"`,
    "i",
  );
  const m = chunk.match(re);
  if (!m) return "";
  return m[1]
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .trim();
}

function parseMapXml(xml: string, city: string): Hit[] {
  const out: Hit[] = [];
  const blocks = xml.split(/<(?:node|way)\s/).slice(1);
  for (const block of blocks) {
    const chunk = block.slice(0, 4500);
    const website = normalizeUrl(
      tagVal(chunk, "website") || tagVal(chunk, "contact:website") || "",
    );
    const emailRaw = tagVal(chunk, "email") || tagVal(chunk, "contact:email") || "";
    const email = emailRaw
      ? normalizeEmail(emailRaw.split(/[;,/\s]+/)[0] || "")
      : "";
    const okEmail = isPlausiblePublicEmail(email) ? email : "";
    if (!website && !okEmail) continue;
    if (website && isBlockedOutreachHost(website) && !okEmail) continue;
    const kind =
      tagVal(chunk, "amenity") ||
      tagVal(chunk, "shop") ||
      tagVal(chunk, "tourism") ||
      tagVal(chunk, "office") ||
      tagVal(chunk, "craft") ||
      tagVal(chunk, "leisure") ||
      "business";
    const name = tagVal(chunk, "name") || "Negocio local";
    out.push({
      url: website && !isBlockedOutreachHost(website) ? website : "",
      email: okEmail,
      name: name.slice(0, 80),
      city,
      kind,
    });
  }
  return out;
}

async function fetchBbox(cell: HarvestCell): Promise<string> {
  const h = 0.011;
  const w = cell.lon - h;
  const s = cell.lat - h;
  const e = cell.lon + h;
  const n = cell.lat + h;
  const url = `https://api.openstreetmap.org/api/0.6/map?bbox=${w},${s},${e},${n}`;
  const res = await fetch(url, {
    headers: { "User-Agent": UA, Accept: "application/xml" },
    signal: AbortSignal.timeout(16_000),
  });
  if (!res.ok) return "";
  return res.text();
}

async function nominatimSearch(
  query: string,
  lat: number,
  lon: number,
  limit = 25,
): Promise<Hit[]> {
  const u = new URL("https://nominatim.openstreetmap.org/search");
  u.searchParams.set("q", query);
  u.searchParams.set("format", "jsonv2");
  u.searchParams.set("addressdetails", "1");
  u.searchParams.set("extratags", "1");
  u.searchParams.set("limit", String(limit));
  u.searchParams.set("countrycodes", "es");
  u.searchParams.set("viewbox", `${lon - 0.15},${lat + 0.12},${lon + 0.15},${lat - 0.12}`);
  u.searchParams.set("bounded", "0");
  try {
    const res = await fetch(u.toString(), {
      headers: { "User-Agent": UA, Accept: "application/json" },
      signal: AbortSignal.timeout(12_000),
    });
    if (!res.ok) return [];
    const rows = (await res.json()) as Array<{
      display_name?: string;
      name?: string;
      type?: string;
      class?: string;
      extratags?: Record<string, string>;
      address?: { city?: string; town?: string; village?: string; municipality?: string };
    }>;
    if (!Array.isArray(rows)) return [];
    const out: Hit[] = [];
    for (const row of rows) {
      const website = normalizeUrl(
        row.extratags?.website ||
          row.extratags?.["contact:website"] ||
          row.extratags?.url ||
          "",
      );
      const emailRaw =
        row.extratags?.email || row.extratags?.["contact:email"] || "";
      const email = emailRaw
        ? normalizeEmail(emailRaw.split(/[;,/\s]+/)[0] || "")
        : "";
      const okEmail = isPlausiblePublicEmail(email) ? email : "";
      if ((!website || isBlockedOutreachHost(website)) && !okEmail) continue;
      const city =
        row.address?.city ||
        row.address?.town ||
        row.address?.village ||
        row.address?.municipality ||
        query.split(" ").slice(-1)[0] ||
        "";
      out.push({
        url: website && !isBlockedOutreachHost(website) ? website : "",
        email: okEmail,
        name: (row.name || row.display_name?.split(",")[0] || "Negocio local").slice(
          0,
          80,
        ),
        city,
        kind: row.type || row.class || "business",
      });
    }
    return out;
  } catch {
    return [];
  }
}

export type HarvestResult = {
  cells: string[];
  mapHits: number;
  searchHits: number;
  emailsQueued: number;
  websAdded: number;
  skipped: number;
  stock: ReturnType<typeof stockCounts>;
  queue: ReturnType<typeof queueCounts>;
};

export async function harvestWebsitesIntoStock(opts?: {
  waveIndex?: number;
  maxCells?: number;
  searchKeywords?: number;
  targetPending?: number;
  /** También encola emails OSM/Nominatim directo (acelera cola mañana). */
  enqueueOsmEmails?: boolean;
}): Promise<HarvestResult> {
  const targetPending = opts?.targetPending ?? 1500;
  const maxCells = opts?.maxCells ?? 6;
  const searchKw = opts?.searchKeywords ?? 5;
  const wave = opts?.waveIndex ?? 0;
  const enqueueOsm = opts?.enqueueOsmEmails !== false;

  const beforeStock = stockCounts((await loadWebsiteStock()).items);
  const cells = harvestCellsForWave(wave, maxCells);
  const webBatch: Array<{
    url: string;
    name: string;
    city: string;
    kind: string;
    source: "osm_map" | "nominatim";
  }> = [];
  const emailBatch: Parameters<typeof enqueueLeads>[0] = [];
  const seenEmail = new Set<string>();
  let mapHits = 0;
  let searchHits = 0;
  const deadline = Date.now() + 110_000;

  const pushHit = (h: Hit, source: "osm_map" | "nominatim") => {
    if (h.email && enqueueOsm && !seenEmail.has(h.email)) {
      seenEmail.add(h.email);
      emailBatch.push({
        email: h.email,
        businessName: h.name,
        city: h.city || "España",
        websiteUrl: h.url || undefined,
        source: source === "osm_map" ? "osm" : "web",
      });
    }
    if (h.url) {
      webBatch.push({
        url: h.url,
        name: h.name,
        city: h.city,
        kind: h.kind,
        source,
      });
    }
  };

  if (beforeStock.pending < targetPending) {
    for (const cell of cells) {
      if (Date.now() > deadline) break;
      try {
        const xml = await fetchBbox(cell);
        if (xml) {
          const hits = parseMapXml(xml, cell.name.split("·")[0] || cell.name);
          mapHits += hits.length;
          for (const h of hits) pushHit(h, "osm_map");
        }
      } catch {
        /* next */
      }
      await new Promise((r) => setTimeout(r, 90));
    }
  }

  const anchor = cells[0] || harvestCellsForWave(0, 1)[0];
  const cityLabel = (anchor?.name || "Fuengirola").split("·")[0];
  const kwStart = wave % BUSINESS_KEYWORDS.length;
  for (let i = 0; i < searchKw; i++) {
    if (Date.now() > deadline) break;
    const kw = BUSINESS_KEYWORDS[(kwStart + i) % BUSINESS_KEYWORDS.length];
    const hits = await nominatimSearch(`${kw} ${cityLabel}`, anchor.lat, anchor.lon, 25);
    searchHits += hits.length;
    for (const h of hits) {
      pushHit({ ...h, city: h.city || cityLabel }, "nominatim");
    }
    await new Promise((r) => setTimeout(r, 1100));
  }

  let emailsQueued = 0;
  if (emailBatch.length) {
    const r = await enqueueLeads(emailBatch);
    emailsQueued = r.added;
  }

  let websAdded = 0;
  let skipped = 0;
  if (webBatch.length && beforeStock.pending < targetPending) {
    const r = await addWebsiteSources(webBatch);
    websAdded = r.added;
    skipped = r.skipped;
  }

  return {
    cells: cells.map((c) => c.cellId),
    mapHits,
    searchHits,
    emailsQueued,
    websAdded,
    skipped,
    stock: stockCounts((await loadWebsiteStock()).items),
    queue: queueCounts((await loadQueue()).leads),
  };
}
