import {
  extractCid,
  extractMapsPlaceName,
  extractPlaceId,
  isGooglePlaceInput,
  mapsSearchUrl,
  mapsUrlFromPlaceId,
  parseGoogleInput,
  reviewUrlFromPlaceId,
  type ParsedGoogle,
} from "./google-url";

export type PlaceHit = {
  name: string;
  address: string;
  reviewUrl: string;
  mapsUrl: string;
  placeId?: string;
  /** true = abre el formulario de escribir reseña. */
  directReview: boolean;
  source: "google" | "url" | "osm";
};

export { mapsSearchUrl, mapsUrlFromPlaceId, parseGoogleInput, reviewUrlFromPlaceId };

function hit(partial: Omit<PlaceHit, "mapsUrl"> & { mapsUrl?: string }): PlaceHit {
  const mapsUrl = partial.mapsUrl || (partial.placeId ? mapsUrlFromPlaceId(partial.placeId) : partial.reviewUrl);
  return { ...partial, mapsUrl };
}

function fromParsed(parsed: ParsedGoogle, source: PlaceHit["source"] = "url"): PlaceHit {
  return hit({
    name: parsed.name,
    address: parsed.address,
    reviewUrl: parsed.reviewUrl,
    mapsUrl: parsed.mapsUrl,
    placeId: parsed.placeId,
    directReview: parsed.directReview,
    source,
  });
}

async function searchPlacesApi(query: string): Promise<PlaceHit[]> {
  const key = process.env.GOOGLE_PLACES_API_KEY || process.env.GOOGLE_MAPS_API_KEY;
  if (!key) return [];

  const res = await fetch("https://places.googleapis.com/v1/places:searchText", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Goog-Api-Key": key,
      "X-Goog-FieldMask": "places.id,places.displayName,places.formattedAddress,places.googleMapsUri",
    },
    body: JSON.stringify({
      textQuery: query,
      languageCode: "es",
      regionCode: "ES",
      maxResultCount: 8,
    }),
  });
  if (!res.ok) {
    const legacy = await fetch(
      `https://maps.googleapis.com/maps/api/place/textsearch/json?query=${encodeURIComponent(query)}&language=es&region=es&key=${key}`,
    );
    if (!legacy.ok) return [];
    const data = (await legacy.json()) as {
      results?: { place_id: string; name: string; formatted_address?: string }[];
    };
    return (data.results || []).map((p) =>
      hit({
        name: p.name,
        address: p.formatted_address || "",
        placeId: p.place_id,
        reviewUrl: reviewUrlFromPlaceId(p.place_id),
        directReview: true,
        source: "google",
      }),
    );
  }
  const data = (await res.json()) as {
    places?: {
      id?: string;
      displayName?: { text?: string };
      formattedAddress?: string;
      googleMapsUri?: string;
    }[];
  };
  return (data.places || [])
    .filter((p) => p.id)
    .map((p) =>
      hit({
        name: p.displayName?.text || "Negocio",
        address: p.formattedAddress || "",
        placeId: p.id,
        reviewUrl: reviewUrlFromPlaceId(p.id!),
        mapsUrl: p.googleMapsUri || mapsUrlFromPlaceId(p.id!),
        directReview: true,
        source: "google",
      }),
    );
}

async function readFollowed(url: string): Promise<{ url: string; body: string }> {
  const ctrl = AbortSignal.timeout(8000);
  const res = await fetch(url, {
    method: "GET",
    redirect: "follow",
    signal: ctrl,
    headers: {
      Accept: "text/html",
      "User-Agent": "Mozilla/5.0 (compatible; NFCTap/1.0; +https://nfctap.tech)",
    },
  });
  const finalUrl = res.url || url;
  let body = "";
  if (!extractPlaceId(finalUrl)) {
    const text = await res.text();
    body = text.slice(0, 180_000);
  }
  return { url: finalUrl, body };
}

function placeIdFromPage(body: string): string | null {
  const tagged = body.match(/["']place_id["']\s*:\s*["'](ChIJ[A-Za-z0-9_-]+)/);
  if (tagged?.[1]) return tagged[1];
  return extractPlaceId(body);
}

async function resolveMapsOrBusinessUrl(raw: string): Promise<PlaceHit | null> {
  const start = raw.startsWith("http") ? raw : `https://${raw}`;
  let parsed = parseGoogleInput(start);
  if (parsed?.directReview) return fromParsed(parsed);

  let followed = start;
  let body = "";
  try {
    const got = await readFollowed(start);
    followed = got.url;
    body = got.body;
  } catch {
    /* sigue con la URL original */
  }

  parsed = parseGoogleInput(followed) || parsed;
  if (parsed?.directReview) return fromParsed(parsed);

  const fromBody = body ? placeIdFromPage(body) : null;
  if (fromBody) {
    const name = extractMapsPlaceName(followed) || parsed?.name || "Ficha Google";
    return hit({
      name,
      address: fromBody,
      placeId: fromBody,
      reviewUrl: reviewUrlFromPlaceId(fromBody),
      directReview: true,
      source: "url",
    });
  }

  const queries = [
    extractMapsPlaceName(followed),
    parsed?.name && parsed.name !== "Negocio de Google" && parsed.name !== "Ficha Google" ? parsed.name : "",
    extractCid(followed) ? `https://maps.google.com/?cid=${extractCid(followed)}` : "",
    followed,
    start,
  ].filter((q, i, all) => q && q.length >= 3 && all.indexOf(q) === i);

  for (const q of queries) {
    const found = await searchPlacesApi(q);
    const exact = found.find((p) => p.directReview);
    if (exact) return exact;
    if (found[0]?.directReview) return found[0];
  }
  return parsed ? fromParsed(parsed) : null;
}

export async function lookupReviewPlaces(input: string): Promise<PlaceHit[]> {
  const q = input.trim();
  if (q.length < 3) return [];

  if (isGooglePlaceInput(q) || /^https?:\/\//i.test(q)) {
    const resolved = await resolveMapsOrBusinessUrl(q);
    if (resolved?.directReview) return [resolved];
    const viaApi = await searchPlacesApi(q);
    if (viaApi.length) return viaApi;
    return resolved ? [resolved] : [];
  }

  const google = await searchPlacesApi(q);
  if (google.length) return google.filter((p) => p.directReview);
  return [];
}
