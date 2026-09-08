import { ACCENT_HEX, BODY_COLORS } from "./catalog";
import { ATRIL } from "./atril-geom";
import type { Order } from "./types";

/** Timeskey Amazon B08LD99GZT: pegatina PET NTAG215 Ø25 × ~0,2 mm. */
export const NFC_STOCK = {
  id: "moneda_25" as const,
  tagDiameter: ATRIL.STICKER_D,
  cavityDiameter: ATRIL.WELL_D,
  seatDiameter: ATRIL.SEAT_D,
  cavityThickness: ATRIL.Z_GUIDE - ATRIL.Z_FLOOR,
};

export const STAND = {
  ancho: ATRIL.FACE_W,
  alto: ATRIL.FACE_H,
  grosor: ATRIL.FACE_T,
  radio: ATRIL.FACE_R,
  nfc: NFC_STOCK.id,
  nfc_desde_base: ATRIL.Z_FLOOR,
  nfc_grosor: NFC_STOCK.cavityThickness,
  relieve: ATRIL.RELIEF,
};

export type PrintSpec = {
  version: 1;
  orderId: string;
  nombre: string;
  kind: Order["kind"];
  qty: Order["qty"];
  ancho: number;
  alto: number;
  grosor: number;
  radio: number;
  nfc: string;
  nfc_desde_base: number;
  relieve: number;
  linea1: string;
  linea2: string;
  nombreNegocio?: string;
  logoMask?: string;
  googleUrl: string;
  extraUrl?: string;
  colores: {
    cuerpo: string;
    acento: string;
  };
  cliente: string;
};

export function printText(value: string) {
  return value
    .replace(/ñ/gi, "\u0001")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^\u0001A-Z0-9 .!?+\-*]/gi, " ")
    .replace(/\s+/g, " ")
    .trim()
    .toUpperCase()
    .replace(/\u0001/g, "Ñ");
}

export function slugName(order: Order) {
  const raw = printText(order.design.line1 || order.address.name || order.id)
    .replace(/Ñ/g, "N")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 32);
  return `${raw || "pedido"}-${order.id.slice(3, 10)}`;
}

export function orderToSpec(order: Order): PrintSpec {
  const generic = order.kind === "generica";
  const body = BODY_COLORS.find((c) => c.id === order.design.bodyColor)?.label ?? "negro";
  const accent = order.design.accentColor;
  return {
    version: 1,
    orderId: order.id,
    nombre: slugName(order),
    kind: order.kind,
    qty: order.qty,
    ...STAND,
    linea1: "TAP",
    linea2: "RESEÑA",
    nombreNegocio: generic ? undefined : order.design.line1,
    logoMask: generic ? undefined : order.design.logoMask,
    googleUrl: order.design.googleUrl,
    extraUrl: order.kind === "unica" ? order.design.extraUrl : undefined,
    colores: {
      cuerpo: `${order.design.bodyColor} (${body})`,
      acento: `${accent} (${ACCENT_HEX[accent] ?? accent})`,
    },
    cliente: order.address.name,
  };
}

/** Hueco abierto: no hay pausa. Se deja por compatibilidad del dashboard. */
export function pauseLayer() {
  return { z: 0, layer: 0, open: true as const };
}
