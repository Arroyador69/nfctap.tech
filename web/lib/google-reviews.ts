/** Enlace NFC de reseña Google a partir de nombre, Place ID o URL pegada. */

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

export function reviewUrlFromPlaceId(placeId: string) {
  return `https://search.google.com/local/writereview?placeid=${encodeURIComponent(placeId)}`;
}

export function mapsUrlFromPlaceId(placeId: string) {
  return `https://www.google.com/maps/place/?q=place_id:${encodeURIComponent(placeId)}`;
}

export function mapsSearchUrl(query: string) {
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`;
}

function hit(partial: Omit<PlaceHit, "mapsUrl"> & { mapsUrl?: string }): PlaceHit {
  const mapsUrl = partial.mapsUrl || (partial.placeId ? mapsUrlFromPlaceId(partial.placeId) : partial.reviewUrl);
  return { ...partial, mapsUrl };
}

/** Convierte un enlace de Maps / búsqueda / g.page en ficha usable para el NFC. */
export function parseGoogleInput(raw: string): PlaceHit | null {
  const t = raw.trim();
  if (!/^https?:\/\//i.test(t) && !t.includes("google.") && !t.includes("g.page") && !t.includes("maps.app")) {
    return null;
  }
  const urlText = /^https?:\/\//i.test(t) ? t : `https://${t}`;

  const placeMatch = urlText.match(/place[_-]?id=([^&/#]+)/i);
  if (placeMatch) {
    const placeId = decodeURIComponent(placeMatch[1]);
    return hit({
      name: "Ficha Google",
      address: placeId,
      placeId,
      reviewUrl: reviewUrlFromPlaceId(placeId),
      directReview: true,
      source: "url",
    });
  }

  const gpage = urlText.match(/g\.page\/r\/([^/?#]+)/i);
  if (gpage) {
    const reviewUrl = `https://g.page/r/${gpage[1]}/review`;
    return hit({
      name: "Pedir reseñas",
      address: "Enlace corto de Google Business",
      reviewUrl,
      mapsUrl: reviewUrl,
      directReview: true,
      source: "url",
    });
  }

  const cid = urlText.match(/[?&]cid=(\d+)/i);
  if (cid) {
    const mapsUrl = `https://maps.google.com/?cid=${cid[1]}`;
    return hit({
      name: "Ficha Google",
      address: `cid ${cid[1]}`,
      reviewUrl: mapsUrl,
      mapsUrl,
      directReview: false,
      source: "url",
    });
  }

  try {
    const u = new URL(urlText);
    const si = u.searchParams.get("si");
    const q = (u.searchParams.get("q") || "").replace(/\+/g, " ").trim();
    if (si) {
      const mapsUrl = `https://www.google.com/maps?si=${encodeURIComponent(si)}`;
      return hit({
        name: q || "Negocio de Google",
        address: "Ficha compartida (el cliente abre Maps y puede opinar)",
        reviewUrl: mapsUrl,
        mapsUrl,
        directReview: false,
        source: "url",
      });
    }
    if (/(^|\.)google\./i.test(u.hostname) && q) {
      return hit({
        name: q,
        address: "Búsqueda Google Maps",
        reviewUrl: mapsSearchUrl(q),
        directReview: false,
        source: "url",
      });
    }
  } catch {
    /* ignore */
  }
  return null;
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

async function searchOsm(query: string): Promise<PlaceHit[]> {
  const url = `https://nominatim.openstreetmap.org/search?format=json&limit=5&countrycodes=es&q=${encodeURIComponent(query)}`;
  const res = await fetch(url, {
    headers: { "User-Agent": "NFCTap/1.0 (hola@nfctap.tech)", Accept: "application/json" },
  });
  if (!res.ok) return [];
  const rows = (await res.json()) as { display_name?: string; name?: string }[];
  return rows.slice(0, 5).map((r) => {
    const name = r.name || query;
    const address = r.display_name || "";
    const q = [name, address].filter(Boolean).join(", ");
    return hit({
      name,
      address,
      reviewUrl: mapsSearchUrl(q),
      directReview: false,
      source: "osm",
    });
  });
}

async function followShortMaps(url: string): Promise<string> {
  try {
    const res = await fetch(url, { method: "HEAD", redirect: "follow" });
    return res.url || url;
  } catch {
    return url;
  }
}

export async function lookupReviewPlaces(input: string): Promise<PlaceHit[]> {
  const q = input.trim();
  if (q.length < 3) return [];

  if (/maps\.app\.goo\.gl|goo\.gl\/maps/i.test(q)) {
    const finalUrl = await followShortMaps(q.startsWith("http") ? q : `https://${q}`);
    const parsed = parseGoogleInput(finalUrl);
    if (parsed) return [parsed];
  }

  const fromUrl = parseGoogleInput(q);
  if (fromUrl) return [fromUrl];

  const google = await searchPlacesApi(q);
  if (google.length) return google;

  const osm = await searchOsm(q);
  if (osm.length) return osm;

  return [
    hit({
      name: q,
      address: "Búsqueda en Google Maps (confirma que abre el negocio)",
      reviewUrl: mapsSearchUrl(q),
      directReview: false,
      source: "url",
    }),
  ];
}
