import { ACCENT_HEX, BODY_COLORS } from "./catalog";
import type { Order } from "./types";

export const STAND = {
  ancho: 70,
  alto: 112,
  grosor: 4,
  radio: 6,
  nfc: "tira_45x15" as const,
  nfc_desde_base: 1.2,
  nfc_grosor: 0.8,
  relieve: 0.4,
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
  logoMask?: string;
  googleUrl: string;
  colores: {
    cuerpo: string;
    estrellas: string;
    texto: string;
    icono: string;
    soporte: string;
  };
  cliente: string;
};

export function printText(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/ñ/gi, "N")
    .replace(/[^A-Z0-9 .!?+\-*]/gi, " ")
    .replace(/\s+/g, " ")
    .trim()
    .toUpperCase();
}

export function slugName(order: Order) {
  const raw = printText(order.design.line1 || order.address.name || order.id)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 32);
  return `${raw || "pedido"}-${order.id.slice(3, 10)}`;
}

export function orderToSpec(order: Order): PrintSpec {
  const generic = order.kind === "generica";
  const body = BODY_COLORS.find((c) => c.id === order.design.bodyColor)?.label ?? "negro";
  const stars = order.design.accentColor;
  return {
    version: 1,
    orderId: order.id,
    nombre: slugName(order),
    kind: order.kind,
    qty: order.qty,
    ...STAND,
    linea1: generic ? "TOCA PARA" : printText(order.design.line1 || "TU NEGOCIO"),
    linea2: generic ? "DEJAR TU RESENA" : printText(order.design.line2 || "TOCA PARA DEJAR TU RESENA"),
    logoMask: generic ? undefined : order.design.logoMask,
    googleUrl: order.design.googleUrl,
    colores: {
      cuerpo: `${order.design.bodyColor} (${body})`,
      estrellas: `${stars} (${ACCENT_HEX[stars] ?? stars})`,
      texto: order.design.bodyColor === "blanco" ? "negro" : "blanco",
      icono: order.design.bodyColor === "blanco" ? "negro" : "blanco",
      soporte: `${order.design.bodyColor} (${body})`,
    },
    cliente: order.address.name,
  };
}

export function pauseLayer(spec: PrintSpec) {
  const z = spec.nfc_desde_base + STAND.nfc_grosor;
  return { z, layer: Math.round(z / 0.2) };
}
