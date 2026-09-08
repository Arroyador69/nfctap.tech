const API = process.env.EXPO_PUBLIC_NFCTAP_API || "https://nfctap.tech";

export type PlaceHit = {
  name: string;
  address: string;
  reviewUrl: string;
  mapsUrl: string;
  placeId?: string;
  directReview: boolean;
  source: string;
};

export async function lookupReviewPlaces(q: string): Promise<PlaceHit[]> {
  const res = await fetch(`${API}/api/places`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ q }),
  });
  const data = (await res.json()) as { places?: PlaceHit[]; error?: string };
  if (!res.ok) throw new Error(data.error || "No se pudo buscar");
  return data.places || [];
}
