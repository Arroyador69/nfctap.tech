/**
 * Fase A — cosecha webs de CUALQUIER negocio (no solo vacacional).
 *
 * Fuentes rápidas:
 * 1) OSM Map API por celdas (anillos Fuengirola → Costa → ES)
 * 2) Photon (Komoot) por ciudad × keyword (restaurante, dentista, hotel…)
 *
 * No scrapea emails aquí: solo mete URLs en website-stock.
 */

import { isBlockedOutreachHost } from "./blocked-hosts";
import { normalizeUrl } from "./emails";
import { harvestCellsForWave, type HarvestCell } from "./place-rings";
import { addWebsiteSources, loadWebsiteStock, stockCounts } from "./website-stock";

const UA =
  "NFCTapHarvest/1.0 (+https://nfctap.tech; website-harvest; contact=contacto@nfctap.tech)";

/** Keywords → muchos tipos (hostelería, salud, belleza, hotel, oficina…). */
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

function parseMapXml(
  xml: string,
  city: string,
): Array<{ url: string; name: string; city: string; kind: string }> {
  const out: Array<{ url: string; name: string; city: string; kind: string }> = [];
  const blocks = xml.split(/<(?:node|way)\s/).slice(1);
  for (const block of blocks) {
    const chunk = block.slice(0, 4500);
    const website = normalizeUrl(
      tagVal(chunk, "website") || tagVal(chunk, "contact:website") || "",
    );
    if (!website || isBlockedOutreachHost(website)) continue;
    const kind =
      tagVal(chunk, "amenity") ||
      tagVal(chunk, "shop") ||
      tagVal(chunk, "tourism") ||
      tagVal(chunk, "office") ||
      tagVal(chunk, "craft") ||
      tagVal(chunk, "leisure") ||
      "business";
    // Sin tipo de negocio y sin email en tags → igual queremos la web si hay name
    const name = tagVal(chunk, "name") || "Negocio local";
    out.push({ url: website, name: name.slice(0, 80), city, kind });
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

type PhotonHit = {
  properties?: {
    name?: string;
    city?: string;
    country?: string;
    osm_value?: string;
    osm_key?: string;
  };
  // Photon a veces no trae website; usamos name+city para búsqueda limitada
};

/**
 * Nominatim (extratags=1): trae `website` de OSM en la búsqueda por texto.
 * 1 req/s · User-Agent obligatorio. Ideal para “restaurante Fuengirola”, “dentista Mijas”…
 */
async function nominatimSearch(
  query: string,
  lat: number,
  lon: number,
  limit = 20,
): Promise<Array<{ url: string; name: string; city: string; kind: string }>> {
  const u = new URL("https://nominatim.openstreetmap.org/search");
  u.searchParams.set("q", query);
  u.searchParams.set("format", "jsonv2");
  u.searchParams.set("addressdetails", "1");
  u.searchParams.set("extratags", "1");
  u.searchParams.set("limit", String(limit));
  u.searchParams.set("countrycodes", "es");
  u.searchParams.set("viewbox", `${lon - 0.12},${lat + 0.1},${lon + 0.12},${lat - 0.1}`);
  u.searchParams.set("bounded", "1");
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
    const out: Array<{ url: string; name: string; city: string; kind: string }> = [];
    for (const row of rows) {
      const website = normalizeUrl(
        row.extratags?.website ||
          row.extratags?.["contact:website"] ||
          row.extratags?.url ||
          "",
      );
      if (!website || isBlockedOutreachHost(website)) continue;
      const city =
        row.address?.city ||
        row.address?.town ||
        row.address?.village ||
        row.address?.municipality ||
        query.split(" ").slice(-1)[0] ||
        "";
      out.push({
        url: website,
        name: (row.name || row.display_name?.split(",")[0] || "Negocio local").slice(0, 80),
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
  added: number;
  skipped: number;
  stock: ReturnType<typeof stockCounts>;
};

/**
 * Un tick de harvest: celdas OSM (Fuengirola primero) + Nominatim por keyword.
 * Objetivo: meter cientos de webs/día en stock sin scrapear emails.
 */
export async function harvestWebsitesIntoStock(opts?: {
  waveIndex?: number;
  maxCells?: number;
  searchKeywords?: number;
  targetPending?: number;
}): Promise<HarvestResult> {
  const targetPending = opts?.targetPending ?? 1500;
  const maxCells = opts?.maxCells ?? 6;
  const searchKw = opts?.searchKeywords ?? 5;
  const wave = opts?.waveIndex ?? 0;

  const before = stockCounts((await loadWebsiteStock()).items);
  if (before.pending >= targetPending) {
    return {
      cells: [],
      mapHits: 0,
      searchHits: 0,
      added: 0,
      skipped: 0,
      stock: before,
    };
  }

  const cells = harvestCellsForWave(wave, maxCells);
  const batch: Array<{
    url: string;
    name: string;
    city: string;
    kind: string;
    source: "osm_map" | "nominatim";
  }> = [];
  let mapHits = 0;
  let searchHits = 0;
  const deadline = Date.now() + 110_000;

  for (const cell of cells) {
    if (Date.now() > deadline) break;
    try {
      const xml = await fetchBbox(cell);
      if (xml) {
        const hits = parseMapXml(xml, cell.name.split("·")[0] || cell.name);
        mapHits += hits.length;
        for (const h of hits) {
          batch.push({ ...h, source: "osm_map" });
        }
      }
    } catch {
      /* next cell */
    }
    await new Promise((r) => setTimeout(r, 100));
  }

  // Nominatim: ciudad ancla + keywords rotadas (1 req/s)
  const anchor = cells[0] || harvestCellsForWave(0, 1)[0];
  const cityLabel = (anchor?.name || "Fuengirola").split("·")[0];
  const kwStart = wave % BUSINESS_KEYWORDS.length;
  for (let i = 0; i < searchKw; i++) {
    if (Date.now() > deadline) break;
    const kw = BUSINESS_KEYWORDS[(kwStart + i) % BUSINESS_KEYWORDS.length];
    const hits = await nominatimSearch(
      `${kw} ${cityLabel}`,
      anchor.lat,
      anchor.lon,
      20,
    );
    searchHits += hits.length;
    for (const h of hits) {
      batch.push({
        ...h,
        city: h.city || cityLabel,
        source: "nominatim",
      });
    }
    await new Promise((r) => setTimeout(r, 1100));
  }

  const { added, skipped, pending } = await addWebsiteSources(batch);
  const stock = stockCounts((await loadWebsiteStock()).items);
  return {
    cells: cells.map((c) => c.cellId),
    mapHits,
    searchHits,
    added,
    skipped,
    stock: { ...stock, pending },
  };
}
