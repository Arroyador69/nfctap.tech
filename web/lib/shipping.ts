import type { ShippingSettings, ShippingZone } from "./types";

/** Tarifas comerciales de partida (carta/sobre). Editables en el dashboard.
 *  Paq Estándar oficial Correos 2026 ~13,65 € (península ≤1 kg) se come el margen
 *  de una tarjeta a 15 €: envía en sobre / carta certificada. */
export const DEFAULT_SHIPPING: ShippingSettings = {
  peninsula: 3.9,
  baleares: 5.9,
  canarias: 8.9,
  ceuta_melilla: 8.9,
  freePeninsulaFrom: 45,
};

export const ZONE_LABEL: Record<ShippingZone, string> = {
  peninsula: "Península",
  baleares: "Baleares",
  canarias: "Canarias",
  ceuta_melilla: "Ceuta / Melilla",
};

export function zoneFromPostalCode(cp: string): ShippingZone {
  const n = cp.replace(/\D/g, "").slice(0, 2);
  if (n === "35" || n === "38") return "canarias";
  if (n === "07") return "baleares";
  if (n === "51" || n === "52") return "ceuta_melilla";
  return "peninsula";
}

export function shippingCost(
  zone: ShippingZone,
  productPrice: number,
  settings: ShippingSettings = DEFAULT_SHIPPING,
) {
  if (zone === "peninsula" && productPrice >= settings.freePeninsulaFrom) {
    return 0;
  }
  return settings[zone];
}

export function euros(n: number) {
  return new Intl.NumberFormat("es-ES", {
    style: "currency",
    currency: "EUR",
  }).format(n);
}
