/**
 * Descubre emails públicos de negocios locales.
 * Primario: OSM Map API (bbox) — estable desde Vercel.
 * Secundario: Overpass si responde (fail-fast).
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
  "NFCTapLeadsBot/1.0 (+https://nfctap.tech; osm-map; contact=contacto@nfctap.tech)";

const OVERPASS_ENDPOINTS = [
  "https://overpass-api.de/api/interpreter",
  "https://overpass.osm.ch/api/interpreter",
];

type OsmHit = {
  name: string;
  email: string;
  website: string;
  city: string;
};

function bboxesAround(c: PlaceCoord, n = 4): Array<[number, number, number, number]> {
  const d = 0.018;
  const offsets = [
    [0, 0],
    [d, 0],
    [-d, 0],
    [0, d],
    [0, -d],
    [d, d],
    [-d, -d],
  ].slice(0, n) as Array<[number, number]>;
  return offsets.map(([ox, oy]) => {
    const lon = c.lon + ox;
    const lat = c.lat + oy;
    const h = 0.012;
    return [lon - h, lat - h, lon + h, lat + h];
  });
}

async function fetchBbox(bbox: [number, number, number, number]): Promise<string> {
  const [w, s, e, n] = bbox;
  const url = `https://api.openstreetmap.org/api/0.6/map?bbox=${w},${s},${e},${n}`;
  const res = await fetch(url, {
    headers: { "User-Agent": UA, Accept: "application/xml" },
    signal: AbortSignal.timeout(18_000),
  });
  if (!res.ok) return "";
  return res.text();
}

function parseOsmXml(xml: string, city: string): OsmHit[] {
  const hits: OsmHit[] = [];
  const blocks = xml.split(/<(?:node|way)\s/).slice(1);
  for (const block of blocks) {
    const chunk = block.slice(0, 4000);
    const name = tagVal(chunk, "name");
    const emailRaw = tagVal(chunk, "email") || tagVal(chunk, "contact:email");
    const website = normalizeUrl(
      tagVal(chunk, "website") || tagVal(chunk, "contact:website") || "",
    );
    const email = emailRaw ? normalizeEmail(emailRaw.split(/[;,/\s]+/)[0] || "") : "";
    if (!email && !website) continue;
    const amenity =
      tagVal(chunk, "amenity") ||
      tagVal(chunk, "shop") ||
      tagVal(chunk, "tourism") ||
      tagVal(chunk, "office") ||
      tagVal(chunk, "craft");
    if (!amenity && !email) continue;
    if (website && /facebook\.com|instagram\.com|twitter\.com|x\.com/i.test(website) && !email) {
      continue;
    }
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

function overpassQuery(c: PlaceCoord): string {
  const r = Math.min(c.radiusM ?? 12000, 14000);
  return `
[out:json][timeout:12];
(
  node(around:${r},${c.lat},${c.lon})["amenity"~"^(cafe|restaurant|bar|fast_food|hairdresser|beauty_salon|clinic|dentist)$"]["website"];
  node(around:${r},${c.lat},${c.lon})["shop"]["website"];
  node(around:${r},${c.lat},${c.lon})["tourism"~"^(hotel|guest_house)$"]["website"];
  node(around:${r},${c.lat},${c.lon})["amenity"~"^(cafe|restaurant|bar)$"]["email"];
);
out tags 40;
`.trim();
}

async function fetchOverpass(query: string): Promise<OsmHit[]> {
  for (const endpoint of OVERPASS_ENDPOINTS) {
    try {
      const res = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
          "User-Agent": UA,
          Accept: "application/json",
        },
        body: "data=" + encodeURIComponent(query),
        signal: AbortSignal.timeout(12_000),
      });
      if (!res.ok) continue;
      const j = (await res.json()) as {
        elements?: Array<{ tags?: Record<string, string> }>;
      };
      const els = Array.isArray(j.elements) ? j.elements : [];
      const hits: OsmHit[] = [];
      for (const el of els) {
        const tags = el.tags || {};
        const name = (tags.name || "Negocio local").slice(0, 60);
        const emailRaw = tags.email || tags["contact:email"] || "";
        const website = normalizeUrl(tags.website || tags["contact:website"] || "");
        const email = emailRaw
          ? normalizeEmail(emailRaw.split(/[;,/\s]+/)[0] || "")
          : "";
        if (!email && !website) continue;
        hits.push({
          name,
          email: isPlausiblePublicEmail(email) ? email : "",
          website,
          city: "",
        });
      }
      return hits;
    } catch {
      /* next mirror */
    }
  }
  return [];
}

async function emailFromWebsite(url: string): Promise<string> {
  try {
    const res = await fetch(url, {
      headers: { "User-Agent": UA, Accept: "text/html" },
      signal: AbortSignal.timeout(5_000),
      redirect: "follow",
    });
    if (!res.ok) return "";
    return extractEmailsFromText((await res.text()).slice(0, 120_000))[0] || "";
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
  persistOk?: boolean;
};

/**
 * Un lote (cron). Varias llamadas/día hasta ~1000 en cola.
 * Hostelería, belleza, salud, tiendas, hoteles, oficinas…
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
  const maxPlaces = opts?.maxPlaces ?? 4;
  const fetchWeb = opts?.fetchWebEmails !== false;
  const maxWeb = opts?.maxWebFetches ?? 45;
  const boxes = opts?.bboxesPerPlace ?? 4;
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
  const deadline = Date.now() + 140_000;

  for (const place of places) {
    if (Date.now() > deadline) break;

    // 1) Map API (principal)
    for (const bbox of bboxesAround(place, boxes)) {
      if (Date.now() > deadline) break;
      let xml = "";
      try {
        xml = await fetchBbox(bbox);
      } catch {
        continue;
      }
      if (!xml) continue;
      const hits = parseOsmXml(xml, place.name);
      osmHits += hits.length;
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
      if (fetchWeb) {
        for (const hit of hits) {
          if (Date.now() > deadline || webFetches >= maxWeb) break;
          if (hit.email || !hit.website) continue;
          const email = await emailFromWebsite(hit.website);
          webFetches++;
          await new Promise((r) => setTimeout(r, 70));
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

    // 2) Overpass opcional (si el mirror responde)
    if (Date.now() < deadline && osmHits < 15) {
      const opHits = (await fetchOverpass(overpassQuery(place))).map((h) => ({
        ...h,
        city: place.name,
      }));
      osmHits += opHits.length;
      for (const hit of opHits) {
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
      if (fetchWeb) {
        for (const hit of opHits) {
          if (Date.now() > deadline || webFetches >= maxWeb) break;
          if (hit.email || !hit.website) continue;
          const email = await emailFromWebsite(hit.website);
          webFetches++;
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

  const { added, skipped, queued, persistOk } = await enqueueLeads(batch);
  return {
    places: places.map((p) => p.name),
    osmHits,
    withEmail: batch.length,
    added,
    skipped,
    queued,
    persistOk,
  };
}

export function needRefill(queued: number, min = 800) {
  return queued < min;
}
