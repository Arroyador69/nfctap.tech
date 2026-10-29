/** Zonas de captación (Costa del Sol → Andalucía → resto España). */

export type PlaceCoord = {
  name: string;
  lat: number;
  lon: number;
  radiusM?: number;
};

export const NFC_PLACES: PlaceCoord[] = [
  // Costa del Sol / Málaga
  { name: "Fuengirola", lat: 36.5441, lon: -4.625, radiusM: 12000 },
  { name: "Mijas", lat: 36.5956, lon: -4.637, radiusM: 12000 },
  { name: "Benalmádena", lat: 36.5988, lon: -4.5167, radiusM: 12000 },
  { name: "Torremolinos", lat: 36.6226, lon: -4.4996, radiusM: 12000 },
  { name: "Málaga", lat: 36.7213, lon: -4.4214, radiusM: 16000 },
  { name: "Marbella", lat: 36.5101, lon: -4.8824, radiusM: 16000 },
  { name: "Estepona", lat: 36.4256, lon: -5.145, radiusM: 12000 },
  { name: "San Pedro Alcántara", lat: 36.486, lon: -4.992, radiusM: 10000 },
  { name: "Nerja", lat: 36.7469, lon: -3.876, radiusM: 12000 },
  { name: "Vélez-Málaga", lat: 36.771, lon: -4.100, radiusM: 12000 },
  { name: "Rincón de la Victoria", lat: 36.717, lon: -4.275, radiusM: 10000 },
  { name: "Antequera", lat: 37.0194, lon: -4.5611, radiusM: 10000 },
  // Andalucía
  { name: "Sevilla", lat: 37.3891, lon: -5.9845, radiusM: 16000 },
  { name: "Granada", lat: 37.1773, lon: -3.5986, radiusM: 14000 },
  { name: "Córdoba", lat: 37.8882, lon: -4.7794, radiusM: 14000 },
  { name: "Cádiz", lat: 36.5271, lon: -6.2886, radiusM: 12000 },
  { name: "Jerez", lat: 36.6866, lon: -6.1372, radiusM: 12000 },
  { name: "Almería", lat: 36.834, lon: -2.4637, radiusM: 12000 },
  { name: "Huelva", lat: 37.2614, lon: -6.9447, radiusM: 12000 },
  { name: "Jaén", lat: 37.7796, lon: -3.7849, radiusM: 10000 },
  // Levante / este
  { name: "Valencia", lat: 39.4699, lon: -0.3763, radiusM: 16000 },
  { name: "Alicante", lat: 38.3452, lon: -0.481, radiusM: 14000 },
  { name: "Elche", lat: 38.2669, lon: -0.6983, radiusM: 12000 },
  { name: "Murcia", lat: 37.9922, lon: -1.1307, radiusM: 14000 },
  { name: "Cartagena", lat: 37.6057, lon: -0.991, radiusM: 12000 },
  { name: "Castellón", lat: 39.9864, lon: -0.0513, radiusM: 12000 },
  // Centro / norte / islas
  { name: "Madrid", lat: 40.4168, lon: -3.7038, radiusM: 14000 },
  { name: "Barcelona", lat: 41.3874, lon: 2.1686, radiusM: 14000 },
  { name: "Zaragoza", lat: 41.6488, lon: -0.8891, radiusM: 14000 },
  { name: "Bilbao", lat: 43.263, lon: -2.935, radiusM: 14000 },
  { name: "San Sebastián", lat: 43.3183, lon: -1.9812, radiusM: 12000 },
  { name: "Vitoria", lat: 42.8467, lon: -2.6716, radiusM: 12000 },
  { name: "Pamplona", lat: 42.8125, lon: -1.6458, radiusM: 12000 },
  { name: "Valladolid", lat: 41.6523, lon: -4.7245, radiusM: 12000 },
  { name: "Salamanca", lat: 40.9701, lon: -5.6635, radiusM: 12000 },
  { name: "Santander", lat: 43.4623, lon: -3.81, radiusM: 12000 },
  { name: "Oviedo", lat: 43.3614, lon: -5.8494, radiusM: 12000 },
  { name: "Gijón", lat: 43.5322, lon: -5.6611, radiusM: 12000 },
  { name: "A Coruña", lat: 43.3623, lon: -8.4115, radiusM: 12000 },
  { name: "Vigo", lat: 42.2406, lon: -8.7207, radiusM: 12000 },
  { name: "Santiago", lat: 42.8782, lon: -8.5448, radiusM: 12000 },
  { name: "Palma", lat: 39.5696, lon: 2.6502, radiusM: 15000 },
  { name: "Las Palmas", lat: 28.1235, lon: -15.4366, radiusM: 14000 },
  { name: "Santa Cruz Tenerife", lat: 28.4636, lon: -16.2518, radiusM: 14000 },
  { name: "Toledo", lat: 39.8628, lon: -4.0273, radiusM: 10000 },
  { name: "Badajoz", lat: 38.8794, lon: -6.9707, radiusM: 12000 },
  { name: "Logroño", lat: 42.4627, lon: -2.44499, radiusM: 10000 },
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
