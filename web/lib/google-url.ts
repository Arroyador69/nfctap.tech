/** Detecta y convierte enlaces de Maps / perfil de empresa en el de escribir reseña. */

export function reviewUrlFromPlaceId(placeId: string) {
  return `https://search.google.com/local/writereview?placeid=${encodeURIComponent(placeId)}`;
}

export function mapsUrlFromPlaceId(placeId: string) {
  return `https://www.google.com/maps/place/?q=place_id:${encodeURIComponent(placeId)}`;
}

export function mapsSearchUrl(query: string) {
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`;
}

export function isDirectReviewUrl(value: string) {
  const t = value.trim();
  return /search\.google\.com\/local\/writereview|g\.page\/r\/[^/?#]+\/review/i.test(t);
}

export function isGooglePlaceInput(value: string) {
  const t = value.trim();
  if (t.length < 8) return false;
  return /google\.|g\.page|maps\.app\.goo\.gl|goo\.gl\/maps|share\.google|business\.google/i.test(t);
}

export function extractPlaceId(text: string): string | null {
  let decoded = text;
  try {
    decoded = decodeURIComponent(text.replace(/\+/g, " "));
  } catch {
    decoded = text;
  }
  const patterns = [
    /place[_-]?id[=:]([A-Za-z0-9_-]+)/i,
    /[?&]query_place_id=([A-Za-z0-9_-]+)/i,
    /!1s(ChIJ[A-Za-z0-9_-]+)/,
    /(ChIJ[A-Za-z0-9_-]{20,})/,
    /(GhIJ[A-Za-z0-9_-]{20,})/,
    /(EhIJ[A-Za-z0-9_-]{20,})/,
  ];
  for (const re of patterns) {
    const m = decoded.match(re);
    if (m?.[1] && !/^0x/i.test(m[1])) return m[1];
  }
  return null;
}

export function extractMapsPlaceName(urlText: string): string {
  try {
    const u = new URL(/^https?:\/\//i.test(urlText) ? urlText : `https://${urlText}`);
    const m = u.pathname.match(/\/maps\/place\/([^/@]+)/i);
    if (!m) return "";
    return decodeURIComponent(m[1].replace(/\+/g, " ")).replace(/\/+$/, "").trim();
  } catch {
    return "";
  }
}

export function extractCid(urlText: string): string | null {
  const cid = urlText.match(/[?&]cid=(\d+)/i);
  if (cid) return cid[1];
  const hex = urlText.match(/!1s(0x[0-9a-f]+:0x[0-9a-f]+)/i);
  if (!hex) return null;
  const tail = hex[1].split(":")[1];
  try {
    return BigInt(tail).toString(10);
  } catch {
    return null;
  }
}

export type ParsedGoogle = {
  name: string;
  address: string;
  reviewUrl: string;
  mapsUrl?: string;
  placeId?: string;
  directReview: boolean;
};

export function parseGoogleInput(raw: string): ParsedGoogle | null {
  const t = raw.trim();
  if (!t) return null;
  const urlText = /^https?:\/\//i.test(t) ? t : isGooglePlaceInput(t) ? `https://${t}` : "";
  if (!urlText) return null;

  const placeId = extractPlaceId(urlText);
  if (placeId) {
    const name = extractMapsPlaceName(urlText) || "Ficha Google";
    return {
      name,
      address: placeId,
      placeId,
      reviewUrl: reviewUrlFromPlaceId(placeId),
      mapsUrl: mapsUrlFromPlaceId(placeId),
      directReview: true,
    };
  }

  const gpage = urlText.match(/g\.page\/r\/([^/?#]+)/i);
  if (gpage) {
    const reviewUrl = `https://g.page/r/${gpage[1]}/review`;
    return {
      name: "Perfil de empresa",
      address: "Enlace corto de Google Business",
      reviewUrl,
      mapsUrl: reviewUrl,
      directReview: true,
    };
  }

  if (/writereview/i.test(urlText)) {
    return {
      name: "Formulario de reseña",
      address: "",
      reviewUrl: urlText,
      directReview: true,
    };
  }

  const cid = extractCid(urlText);
  if (cid) {
    const mapsUrl = `https://maps.google.com/?cid=${cid}`;
    return {
      name: extractMapsPlaceName(urlText) || "Ficha Google",
      address: `cid ${cid}`,
      reviewUrl: mapsUrl,
      mapsUrl,
      directReview: false,
    };
  }

  try {
    const u = new URL(urlText);
    const name = extractMapsPlaceName(urlText) || (u.searchParams.get("q") || "").replace(/\+/g, " ").trim();
    if (/(^|\.)google\./i.test(u.hostname) || /maps\.app\.goo\.gl|goo\.gl|share\.google|business\.google/i.test(u.hostname)) {
      return {
        name: name || "Negocio de Google",
        address: "Enlace de Maps o perfil de empresa",
        reviewUrl: urlText,
        mapsUrl: urlText,
        directReview: false,
      };
    }
  } catch {
    /* ignore */
  }
  return null;
}
