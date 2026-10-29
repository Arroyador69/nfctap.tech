/**
 * Descubre emails públicos de negocios locales vía Overpass (OSM).
 * Qualquier amenity/shop/tourism/office/craft con email o website.
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
  "NFCTapLeadsBot/1.0 (+https://nfctap.tech; osm-overpass; contact=contacto@nfctap.tech)";

const OVERPASS_ENDPOINTS = [
  "https://overpass.kumi.systems/api/interpreter",
  "https://lz4.overpass-api.de/api/interpreter",
  "https://overpass.osm.ch/api/interpreter",
  "https://overpass-api.de/api/interpreter",
];

type OsmHit = {
  name: string;
  email: string;
  website: string;
  city: string;
};

function overpassQueries(c: PlaceCoord): string[] {
  const r = Math.min(c.radiusM ?? 12000, 15000);
  const lat = c.lat;
  const lon = c.lon;
  // 2 queries/ciudad (cabe en cron ~5 min). Hostelería + resto negocios.
  return [
    `
[out:json][timeout:18];
(
  nwr(around:${r},${lat},${lon})["amenity"~"^(cafe|restaurant|bar|fast_food|pub|ice_cream)$"]["website"];
  nwr(around:${r},${lat},${lon})["amenity"~"^(cafe|restaurant|bar|fast_food)$"]["email"];
  nwr(around:${r},${lat},${lon})["amenity"~"^(cafe|restaurant|bar)$"]["contact:website"];
  nwr(around:${r},${lat},${lon})["amenity"~"^(cafe|restaurant|bar)$"]["contact:email"];
);
out tags 45;
`.trim(),
    `
[out:json][timeout:18];
(
  nwr(around:${r},${lat},${lon})["amenity"~"^(hairdresser|beauty_salon|clinic|dentist|pharmacy)$"]["website"];
  nwr(around:${r},${lat},${lon})["shop"~"^(hairdresser|beauty|clothes|bakery|florist|optician)$"]["website"];
  nwr(around:${r},${lat},${lon})["tourism"~"^(hotel|guest_house|hostel)$"]["website"];
  nwr(around:${r},${lat},${lon})["office"]["website"];
  nwr(around:${r},${lat},${lon})["shop"]["email"];
);
out tags 45;
`.trim(),
  ];
}

async function fetchOverpass(query: string, timeoutMs = 14_000): Promise<unknown[]> {
  let lastErr: unknown;
  // Máx. 2 mirrors (si fallan, no quemar el cron entero).
  for (const endpoint of OVERPASS_ENDPOINTS.slice(0, 2)) {
    try {
      const res = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
          "User-Agent": UA,
          Accept: "application/json",
        },
        body: "data=" + encodeURIComponent(query),
        signal: AbortSignal.timeout(timeoutMs),
      });
      if (!res.ok) {
        lastErr = new Error(`overpass ${res.status}`);
        continue;
      }
      const j = (await res.json()) as { elements?: unknown[] };
      return Array.isArray(j.elements) ? j.elements : [];
    } catch (e) {
      lastErr = e;
    }
  }
  if (lastErr) {
    console.warn(
      "[discover] overpass skip",
      lastErr instanceof Error ? lastErr.message : String(lastErr),
    );
  }
  return [];
}

function tagsOf(el: unknown): Record<string, string> {
  if (!el || typeof el !== "object") return {};
  const t = (el as { tags?: Record<string, string> }).tags;
  return t && typeof t === "object" ? t : {};
}

function elementsToHits(elements: unknown[], city: string): OsmHit[] {
  const hits: OsmHit[] = [];
  for (const el of elements) {
    const tags = tagsOf(el);
    const name = (tags.name || tags["name:es"] || "Negocio local").slice(0, 60);
    const emailRaw =
      tags.email || tags["contact:email"] || tags["contact:e-mail"] || "";
    const website = normalizeUrl(
      tags.website || tags["contact:website"] || tags["contact:facebook"] || "",
    );
    // Skip pure social if no real site/email
    const email = emailRaw
      ? normalizeEmail(emailRaw.split(/[;,/\s]+/)[0] || "")
      : "";
    if (!email && !website) continue;
    if (website && /facebook\.com|instagram\.com|twitter\.com|x\.com/i.test(website) && !email) {
      continue;
    }
    hits.push({
      name,
      email: isPlausiblePublicEmail(email) ? email : "",
      website,
      city,
    });
  }
  return hits;
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
 * Un lote (para cron). Varias llamadas/día hasta ~1000 en cola.
 * Cubre hostelería, belleza, salud, tiendas, hoteles, oficinas…
 */
export async function discoverIntoQueue(opts?: {
  targetQueued?: number;
  maxPlaces?: number;
  waveIndex?: number;
  fetchWebEmails?: boolean;
  maxWebFetches?: number;
}): Promise<DiscoverResult> {
  const target = opts?.targetQueued ?? 1000;
  const maxPlaces = opts?.maxPlaces ?? 4;
  const fetchWeb = opts?.fetchWebEmails !== false;
  const maxWeb = opts?.maxWebFetches ?? 40;
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
    for (const query of overpassQueries(place)) {
      const elements = await fetchOverpass(query);
      const hits = elementsToHits(elements, place.name);
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
          if (webFetches >= maxWeb) break;
          if (hit.email || !hit.website) continue;
          const email = await emailFromWebsite(hit.website);
          webFetches++;
          await new Promise((r) => setTimeout(r, 120));
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
      if (webFetches >= maxWeb && batch.length > 80) break;
    }
    await new Promise((r) => setTimeout(r, 250));
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
