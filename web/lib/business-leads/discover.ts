/**
 * Descubre emails públicos de negocios locales.
 * Fuente: OSM Map API (bbox) — Overpass público va a timeout.
 * Cualquier negocio con email/web público · sin inventar correos.
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

function bboxesAround(c: PlaceCoord): Array<[number, number, number, number]> {
  // lonW, latS, lonE, latN — cajas ~1,5 km (API OSM aguanta)
  const d = 0.014;
  const offsets = [
    [0, 0],
    [d, 0],
    [-d, 0],
    [0, d],
    [0, -d],
    [d, d],
    [-d, -d],
  ] as const;
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
    signal: AbortSignal.timeout(25_000),
  });
  if (!res.ok) return "";
  return res.text();
}

/** Parseo ligero de tags en XML OSM (node/way). */
function parseOsmXml(xml: string, city: string): OsmHit[] {
  const hits: OsmHit[] = [];
  // trozos por <node …>…</node> y <way …>…</way>
  const blocks = xml.split(/<(?:node|way)\s/).slice(1);
  for (const block of blocks) {
    const chunk = block.slice(0, 4000);
    const name = tagVal(chunk, "name");
    const emailRaw = tagVal(chunk, "email") || tagVal(chunk, "contact:email");
    const website = normalizeUrl(
      tagVal(chunk, "website") || tagVal(chunk, "contact:website") || "",
    );
    const email = emailRaw ? normalizeEmail(emailRaw.split(/[;,\/\s]+/)[0] || "") : "";
    if (!name && !email && !website) continue;
    // solo con señal comercial
    const amenity = tagVal(chunk, "amenity") || tagVal(chunk, "shop") || tagVal(chunk, "tourism") || tagVal(chunk, "office") || tagVal(chunk, "craft");
    if (!email && !website) continue;
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
      signal: AbortSignal.timeout(7_000),
      redirect: "follow",
    });
    if (!res.ok) return "";
    const html = (await res.text()).slice(0, 160_000);
    const emails = extractEmailsFromText(html);
    return emails[0] || "";
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
 * Rellena cola. Prioriza Costa del Sol y luego resto de NFC_PLACES.
 */
export async function discoverIntoQueue(opts?: {
  targetQueued?: number;
  maxPlaces?: number;
  waveIndex?: number;
  fetchWebEmails?: boolean;
}): Promise<DiscoverResult> {
  const target = opts?.targetQueued ?? 1000;
  const maxPlaces = opts?.maxPlaces ?? 10;
  const fetchWeb = opts?.fetchWebEmails !== false;
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
    if (batch.length + currentQueued >= target) break;

    for (const bbox of bboxesAround(place)) {
      if (batch.length + currentQueued >= target) break;
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
        let email = hit.email;
        if (!email && fetchWeb && hit.website && webFetches < 80) {
          email = await emailFromWebsite(hit.website);
          webFetches++;
          await new Promise((r) => setTimeout(r, 200));
        }
        if (!email || seen.has(email)) continue;
        seen.add(email);
        batch.push({
          email,
          businessName: hit.name,
          city: place.name,
          websiteUrl: hit.website || undefined,
          source: hit.email ? "osm" : "web",
        });
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

export function needRefill(queued: number, min = 1000) {
  return queued < min;
}
