/**
 * Descubre emails públicos de negocios locales vía OpenStreetMap (Overpass).
 * Cualquier tipo: hostelería, belleza, salud, tienda, oficina, hotel…
 * Solo tags email / contact:email / website con mailto — sin inventar correos.
 */

import { extractEmailsFromText, isPlausiblePublicEmail, normalizeEmail, normalizeUrl } from "./emails";
import { placesForWave, type PlaceCoord, NFC_PLACES } from "./places";
import { enqueueLeads } from "./queue";

const UA =
  "NFCTapLeadsBot/1.0 (+https://nfctap.tech; osm-business-discovery; contact=contacto@nfctap.tech)";

const OVERPASS = [
  "https://overpass.kumi.systems/api/interpreter",
  "https://lz4.overpass-api.de/api/interpreter",
  "https://overpass-api.de/api/interpreter",
];

function queryAround(c: PlaceCoord) {
  const r = Math.min(c.radiusM ?? 12000, 16000);
  return `
[out:json][timeout:22];
(
  nwr(around:${r},${c.lat},${c.lon})["email"];
  nwr(around:${r},${c.lat},${c.lon})["contact:email"];
  nwr(around:${r},${c.lat},${c.lon})["amenity"~"^(cafe|restaurant|bar|fast_food|clinic|dentist|doctors|pharmacy|bank|fuel)$"]["website"];
  nwr(around:${r},${c.lat},${c.lon})["shop"]["website"];
  nwr(around:${r},${c.lat},${c.lon})["tourism"~"^(hotel|guest_house|hostel|motel)$"]["website"];
  nwr(around:${r},${c.lat},${c.lon})["office"]["website"];
  nwr(around:${r},${c.lat},${c.lon})["craft"]["website"];
);
out tags 80;
`.trim();
}

async function fetchOverpass(query: string): Promise<unknown[]> {
  for (const endpoint of OVERPASS) {
    try {
      const res = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
          "User-Agent": UA,
          Accept: "application/json",
        },
        body: "data=" + encodeURIComponent(query),
        signal: AbortSignal.timeout(20_000),
      });
      if (!res.ok) continue;
      const j = (await res.json()) as { elements?: unknown[] };
      return Array.isArray(j.elements) ? j.elements : [];
    } catch {
      /* next mirror */
    }
  }
  return [];
}

type OsmEl = {
  tags?: Record<string, string>;
};

function pickEmail(tags: Record<string, string>): string {
  for (const k of ["email", "contact:email", "contact:mail"]) {
    const raw = (tags[k] || "").split(/[;,\/\s]+/)[0] || "";
    const e = normalizeEmail(raw);
    if (isPlausiblePublicEmail(e)) return e;
  }
  return "";
}

function pickWebsite(tags: Record<string, string>): string {
  return normalizeUrl(tags.website || tags["contact:website"] || tags["contact:facebook"] || "");
}

async function emailFromWebsite(url: string): Promise<string> {
  try {
    const res = await fetch(url, {
      headers: { "User-Agent": UA, Accept: "text/html" },
      signal: AbortSignal.timeout(8_000),
      redirect: "follow",
    });
    if (!res.ok) return "";
    const html = (await res.text()).slice(0, 180_000);
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
 * Rellena la cola hasta `targetQueued` (p. ej. 1000 = hoy 500 + mañana 500).
 * `waveIndex` rota las zonas.
 */
export async function discoverIntoQueue(opts?: {
  targetQueued?: number;
  maxPlaces?: number;
  waveIndex?: number;
  fetchWebEmails?: boolean;
}): Promise<DiscoverResult> {
  const maxPlaces = opts?.maxPlaces ?? 12;
  void opts?.targetQueued; // la cola acumula; el caller decide cuándo parar
  const waveIndex = opts?.waveIndex ?? 0;
  const fetchWeb = opts?.fetchWebEmails !== false;

  const places = placesForWave(waveIndex, maxPlaces);
  // Si hace falta más cobertura, sigue la lista completa
  const all = [...places];
  for (const p of NFC_PLACES) {
    if (all.length >= maxPlaces) break;
    if (!all.some((x) => x.name === p.name)) all.push(p);
  }

  let osmHits = 0;
  const batch: Parameters<typeof enqueueLeads>[0] = [];
  const seenEmail = new Set<string>();

  for (const place of all) {
    const elements = await fetchOverpass(queryAround(place));
    osmHits += elements.length;

    for (const raw of elements) {
      const el = raw as OsmEl;
      const tags = el.tags || {};
      const name = (tags.name || tags["name:es"] || "").trim().slice(0, 60);
      let email = pickEmail(tags);
      const website = pickWebsite(tags);

      if (!email && fetchWeb && website) {
        email = await emailFromWebsite(website);
        // ritmo suave hacia webs
        await new Promise((r) => setTimeout(r, 250));
      }
      if (!email || seenEmail.has(email)) continue;
      seenEmail.add(email);

      batch.push({
        email,
        businessName: name || "Negocio local",
        city: place.name,
        websiteUrl: website || undefined,
        source: pickEmail(tags) ? "osm" : "web",
      });
    }
  }

  const { added, skipped, queued } = await enqueueLeads(batch);
  return {
    places: all.map((p) => p.name),
    osmHits,
    withEmail: batch.length,
    added,
    skipped,
    queued,
  };
}

/** ¿Hace falta rellenar para tener margen hoy+mañana? */
export function needRefill(queued: number, min = 1000) {
  return queued < min;
}
