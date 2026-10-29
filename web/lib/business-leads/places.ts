/** Zonas de captación (prioridad Costa del Sol → España). */

export type PlaceCoord = {
  name: string;
  lat: number;
  lon: number;
  radiusM?: number;
};

export const NFC_PLACES: PlaceCoord[] = [
  { name: "Fuengirola", lat: 36.5441, lon: -4.625, radiusM: 10000 },
  { name: "Mijas", lat: 36.5956, lon: -4.637, radiusM: 10000 },
  { name: "Benalmádena", lat: 36.5988, lon: -4.5167, radiusM: 10000 },
  { name: "Torremolinos", lat: 36.6226, lon: -4.4996, radiusM: 10000 },
  { name: "Málaga", lat: 36.7213, lon: -4.4214, radiusM: 15000 },
  { name: "Marbella", lat: 36.5101, lon: -4.8824, radiusM: 15000 },
  { name: "Nerja", lat: 36.7469, lon: -3.876, radiusM: 10000 },
  { name: "Sevilla", lat: 37.3891, lon: -5.9845, radiusM: 15000 },
  { name: "Granada", lat: 37.1773, lon: -3.5986, radiusM: 12000 },
  { name: "Córdoba", lat: 37.8882, lon: -4.7794, radiusM: 12000 },
  { name: "Cádiz", lat: 36.5271, lon: -6.2886, radiusM: 12000 },
  { name: "Almería", lat: 36.834, lon: -2.4637, radiusM: 12000 },
  { name: "Valencia", lat: 39.4699, lon: -0.3763, radiusM: 15000 },
  { name: "Alicante", lat: 38.3452, lon: -0.481, radiusM: 12000 },
  { name: "Murcia", lat: 37.9922, lon: -1.1307, radiusM: 12000 },
  { name: "Madrid", lat: 40.4168, lon: -3.7038, radiusM: 12000 },
  { name: "Barcelona", lat: 41.3874, lon: 2.1686, radiusM: 12000 },
  { name: "Zaragoza", lat: 41.6488, lon: -0.8891, radiusM: 12000 },
  { name: "Bilbao", lat: 43.263, lon: -2.935, radiusM: 12000 },
  { name: "Palma", lat: 39.5696, lon: 2.6502, radiusM: 15000 },
];

/** Ciudades para la prueba de mail en captación. */
export const NFC_TEST_CITIES = NFC_PLACES.map((p) => p.name);

export function placeByName(name: string): PlaceCoord | undefined {
  const n = name.trim().toLowerCase();
  return NFC_PLACES.find((p) => p.name.toLowerCase() === n);
}

/** Rota zonas por día Madrid + índice de oleada. */
export function placesForWave(waveIndex: number, count = 3): PlaceCoord[] {
  const day = Math.floor(Date.now() / 86_400_000);
  const start = (day * 5 + waveIndex * 3) % NFC_PLACES.length;
  const out: PlaceCoord[] = [];
  for (let i = 0; i < count; i++) {
    out.push(NFC_PLACES[(start + i) % NFC_PLACES.length]);
  }
  return out;
}
