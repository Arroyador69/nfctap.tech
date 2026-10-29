/**
 * Anillos geográficos: Fuengirola primero → Costa → España.
 * Cada celda es un punto para harvest OSM (bbox pequeño = rápido + denso).
 */

import { NFC_PLACES, type PlaceCoord } from "./places";

export type HarvestCell = PlaceCoord & { ring: number; cellId: string };

/** Centro Costa del Sol (Fuengirola). */
export const FUENGIROLA: PlaceCoord = {
  name: "Fuengirola",
  lat: 36.5441,
  lon: -4.625,
  radiusM: 8000,
};

/**
 * Genera celdas en anillos alrededor de un centro.
 * ring 0 = centro; ring 1 = ~3 km; ring 2 = ~6 km…
 */
export function cellsAround(
  center: PlaceCoord,
  rings = 3,
  stepDeg = 0.028,
): HarvestCell[] {
  const out: HarvestCell[] = [];
  out.push({
    ...center,
    ring: 0,
    cellId: `${center.name}-r0-c0`,
    radiusM: 6000,
  });
  let n = 1;
  for (let r = 1; r <= rings; r++) {
    const count = r * 6;
    for (let i = 0; i < count; i++) {
      const ang = (2 * Math.PI * i) / count;
      const lat = center.lat + Math.cos(ang) * stepDeg * r;
      const lon = center.lon + Math.sin(ang) * stepDeg * r;
      out.push({
        name: `${center.name}·a${r}`,
        lat,
        lon,
        radiusM: 5000,
        ring: r,
        cellId: `${center.name}-r${r}-c${i}`,
      });
      n++;
    }
  }
  return out;
}

/** Orden de expansión: Fuengirola densificado → vecinos → resto NFC_PLACES. */
export function harvestCellsForWave(waveIndex: number, take = 6): HarvestCell[] {
  const fuengirolaCells = cellsAround(FUENGIROLA, 3, 0.025);
  const costa = [
    "Mijas",
    "Benalmádena",
    "Torremolinos",
    "Málaga",
    "Marbella",
    "Estepona",
    "Nerja",
  ]
    .map((name) => NFC_PLACES.find((p) => p.name === name))
    .filter(Boolean) as PlaceCoord[];

  const costaCells: HarvestCell[] = costa.flatMap((p, i) =>
    cellsAround(p, 1, 0.03).map((c) => ({
      ...c,
      ring: 10 + i,
      cellId: `costa-${c.cellId}`,
    })),
  );

  const rest: HarvestCell[] = NFC_PLACES.filter(
    (p) =>
      p.name !== "Fuengirola" &&
      !costa.some((c) => c.name === p.name),
  ).map((p, i) => ({
    ...p,
    ring: 40 + i,
    cellId: `es-${p.name}`,
  }));

  const all = [...fuengirolaCells, ...costaCells, ...rest];
  const start = Math.abs(waveIndex) % all.length;
  const out: HarvestCell[] = [];
  for (let i = 0; i < take && i < all.length; i++) {
    out.push(all[(start + i) % all.length]);
  }
  return out;
}
