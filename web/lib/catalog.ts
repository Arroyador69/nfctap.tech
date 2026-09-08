import type { AccentColor, BodyColor, ProductKind, Qty } from "./types";

export const BRAND = {
  name: "NFCTap",
  domain: "nfctap.tech",
  legacyDomain: "nfctab.tech",
  tagline: "Toca. Opina. En Google.",
  email: "hola@nfctap.tech",
};

export const PRICES: Record<ProductKind, Record<Qty, number>> = {
  generica: { 1: 15, 2: 30 },
  personalizada: { 1: 30, 2: 45 },
};

export const BODY_COLORS: { id: BodyColor; label: string; hex: string }[] = [
  { id: "negro", label: "Negro mate", hex: "#141416" },
  { id: "blanco", label: "Blanco mate", hex: "#f4f1ea" },
  { id: "rojo", label: "Rojo mate", hex: "#b4232c" },
];

export const ACCENT_HEX: Record<string, string> = {
  oro: "#e2b43a",
  amarillo: "#e2b43a",
  blanco: "#f7f4ee",
  rojo: "#c42b34",
  negro: "#141416",
};

export const ACCENT_COLORS: { id: AccentColor; label: string }[] = [
  { id: "amarillo", label: "Amarillo" },
  { id: "rojo", label: "Rojo" },
  { id: "negro", label: "Negro" },
  { id: "blanco", label: "Blanco" },
];

export const TEMPLATES = [
  {
    id: "clasica" as const,
    name: "Clásica",
    blurb: "Cinco estrellas, texto y badge. La que más se vende en barra.",
  },
  {
    id: "minimal" as const,
    name: "Minimal",
    blurb: "Poco texto, mucho aire. Encaja en recepciones y clínicas.",
  },
  {
    id: "barra" as const,
    name: "Barra",
    blurb: "Más grande visualmente, pensada para verse desde lejos.",
  },
];

export function productLabel(kind: ProductKind, qty: Qty) {
  const base = kind === "generica" ? "Genérica" : "Personalizada";
  return qty === 2 ? `${base} × 2` : `${base} × 1`;
}

export function defaultDesign(kind: ProductKind) {
  return {
    kind,
    template: "clasica" as const,
    bodyColor: "negro" as const,
    accentColor: "amarillo" as const,
    line1: kind === "generica" ? "TAP" : "",
    line2: "RESEÑA",
    googleUrl: "",
  };
}
