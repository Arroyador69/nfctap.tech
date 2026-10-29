/**
 * Descubre emails públicos vía OSM Map API (bbox).
 * Diseñado para caber en cron: pocas cajas + pocos scrapes web.
 */

import {
  extractEmailsFromText,
  isPlausiblePublicEmail,
  normalizeEmail,
  normalizeUrl,
} from "./emails";
import { NFC_PLACES, type PlaceCoord } from "./places";
import { enqueueLeads, loadQueue, queueCounts } from "./queue";

const UA =
  "NFCTapLeadsBot/1.0 (+https://nfctap.tech; osm-map-discovery; contact=contacto@nfctap.tech)";

type OsmHit = {
  name: string;
  email: string;
  website: string;
  city: string;
};

function bboxesAround(c: PlaceCoord, n = 3): Array<[number, number, number, number]> {
  const d = 0.015;
  const offsets = [
    [0, 0],
    [d, 0],
    [-d, 0],
    [0, d],
    [0, -d],
  ].slice(0, n) as Array<[number, number]>;
  return offsets.map(([ox, oy]) => {
    const lon = c.lon + ox;
    const lat = c.lat + oy;
    const h = 0.013;
    return [lon - h, lat - h, lon + h, lat + h];
  });
}

async function fetchBbox(bbox: [number, number, number, number]): Promise<string> {
  const [w, s, e, n] = bbox;
  const url = `https://api.openstreetmap.org/api/0.6/map?bbox=${w},${s},${e},${n}`;
  const res = await fetch(url, {
    headers: { "User-Agent": UA, Accept: "application/xml" },
    signal: AbortSignal.timeout(20_000),
  });
  if (!res.ok) return "";
  return res.text();
}

function parseOsmXml(xml: string, city: string): OsmHit[] {
  const hits: OsmHit[] = [];
  const blocks = xml.split(/<(?:node|way)\s/).slice(1);
  for (const block of blocks) {
    const chunk = block.slice(0, 3500);
    const name = tagVal(chunk, "name");
    const emailRaw = tagVal(chunk, "email") || tagVal(chunk, "contact:email");
    const website = normalizeUrl(
      tagVal(chunk, "website") || tagVal(chunk, "contact:website") || "",
    );
    const email = emailRaw ? normalizeEmail(emailRaw.split(/[;,\/\s]+/)[0] || "") : "";
    if (!email && !website) continue;
    const amenity =
      tagVal(chunk, "amenity") ||
      tagVal(chunk, "shop") ||
      tagVal(chunk, "tourism") ||
      tagVal(chunk, "office") ||
      tagVal(chunk, "craft");
    if (!amenity && !email) continue;
    hits.push({
      name: (name || "Negocio local").slice(0, 60),
      email: isPlausiblePublicEmail(email) ? email : "",
      website,
      city,
    });
  }
  return hits;
}

function tagVal(chunk: string, key: string): string {
  const re = new RegExp(`k="${escapeRe(key)}"\\s+v="([^"]*)"`, "i");
  const m = chunk.match(re);
  if (!m) return "";
  return m[1]
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .trim();
}

function escapeRe(s: string) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

async function emailFromWebsite(url: string): Promise<string> {
  try {
    const res = await fetch(url, {
      headers: { "User-Agent": UA, Accept: "text/html" },
      signal: AbortSignal.timeout(6_000),
      redirect: "follow",
    });
    if (!res.ok) return "";
    const html = (await res.text()).slice(0, 140_000);
    return extractEmailsFromText(html)[0] || "";
  } catch {
    return "";
  }
}

export type DiscoverResult = {
  places: string[];
  osmHits: number;
  withEmail: number;
  added: number;
  skipped: number;
  queued: number;
};

/**
 * Un lote pequeño (para cron). Llama varias veces al día hasta ~1000 en cola.
 */
export async function discoverIntoQueue(opts?: {
  targetQueued?: number;
  maxPlaces?: number;
  waveIndex?: number;
  fetchWebEmails?: boolean;
  maxWebFetches?: number;
  bboxesPerPlace?: number;
}): Promise<DiscoverResult> {
  const target = opts?.targetQueued ?? 1000;
  const maxPlaces = opts?.maxPlaces ?? 3;
  const fetchWeb = opts?.fetchWebEmails !== false;
  const maxWeb = opts?.maxWebFetches ?? 35;
  const boxes = opts?.bboxesPerPlace ?? 3;
  const start = (opts?.waveIndex || 0) % NFC_PLACES.length;

  const places: PlaceCoord[] = [];
  for (let i = 0; i < NFC_PLACES.length && places.length < maxPlaces; i++) {
    places.push(NFC_PLACES[(start + i) % NFC_PLACES.length]);
  }

  const currentQueued = queueCounts((await loadQueue()).leads).queued;
  if (currentQueued >= target) {
    return {
      places: places.map((p) => p.name),
      osmHits: 0,
      withEmail: 0,
      added: 0,
      skipped: 0,
      queued: currentQueued,
    };
  }

  let osmHits = 0;
  const batch: Parameters<typeof enqueueLeads>[0] = [];
  const seen = new Set<string>();
  let webFetches = 0;

  for (const place of places) {
    for (const bbox of bboxesAround(place, boxes)) {
      let xml = "";
      try {
        xml = await fetchBbox(bbox);
      } catch {
        continue;
      }
      if (!xml) continue;
      const hits = parseOsmXml(xml, place.name);
      osmHits += hits.length;

      // 1) emails ya en OSM
      for (const hit of hits) {
        if (!hit.email || seen.has(hit.email)) continue;
        seen.add(hit.email);
        batch.push({
          email: hit.email,
          businessName: hit.name,
          city: place.name,
          websiteUrl: hit.website || undefined,
          source: "osm",
        });
      }

      // 2) scrape limitado de webs sin email
      if (fetchWeb) {
        for (const hit of hits) {
          if (webFetches >= maxWeb) break;
          if (hit.email || !hit.website) continue;
          const email = await emailFromWebsite(hit.website);
          webFetches++;
          await new Promise((r) => setTimeout(r, 180));
          if (!email || seen.has(email)) continue;
          seen.add(email);
          batch.push({
            email,
            businessName: hit.name,
            city: place.name,
            websiteUrl: hit.website,
            source: "web",
          });
        }
      }
    }
  }

  const { added, skipped, queued } = await enqueueLeads(batch);
  return {
    places: places.map((p) => p.name),
    osmHits,
    withEmail: batch.length,
    added,
    skipped,
    queued,
  };
}

export function needRefill(queued: number, min = 800) {
  return queued < min;
}
