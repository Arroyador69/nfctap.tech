import type {
  AccentColor,
  BodyColor,
  CardDesign,
  CatalogModel,
  FaceModel,
  Order,
  OrderPiece,
  ProductKind,
  Qty,
} from "./types";

export const BRAND = {
  name: "NFCTap",
  domain: "nfctap.tech",
  url: "https://nfctap.tech",
  legacyDomain: "nfctab.tech",
  tagline: "Toca. WhatsApp, Instagram o Google.",
  email: "contacto@nfctap.tech",
};

/** Pack web = 1 o 2. Lotes (varios locales, más piezas) por email, sin SKU Polar nuevo. */
export const LOTE_MAILTO = `mailto:${BRAND.email}?subject=${encodeURIComponent("Lote NFCTap — varios locales")}&body=${encodeURIComponent("Hola Alberto,\n\nQuiero un lote (más de dos piezas o varios locales).\n\nCuántas piezas:\nModelos (Google / WhatsApp / Instagram / logo):\nPueblo:\n\n")}`;

export const SOCIALS = [
  { id: "instagram", label: "Instagram", href: "https://www.instagram.com/nfctap/" },
  { id: "tiktok", label: "TikTok", href: "https://www.tiktok.com/@nfctap" },
  { id: "youtube", label: "YouTube", href: "https://www.youtube.com/@nfctap" },
  { id: "facebook", label: "Facebook", href: "https://www.facebook.com/nfctap" },
] as const;

export const PRICES: Record<ProductKind, Record<Qty, number>> = {
  generica: { 1: 20, 2: 35 },
  personalizada: { 1: 30, 2: 55 },
  unica: { 1: 70, 2: 70 },
};

export const FACE_MODELS: {
  id: CatalogModel;
  label: string;
  blurb: string;
  placeholder: string;
  hint: string;
}[] = [
  {
    id: "google",
    label: "Google",
    blurb: "Se abre tu reseña.",
    placeholder: "https://g.page/r/…/review",
    hint: "El enlace de Pedir reseñas, o búscalo abajo.",
  },
  {
    id: "whatsapp",
    label: "WhatsApp",
    blurb: "Se abre tu chat.",
    placeholder: "https://wa.me/34600000000",
    hint: "Número con prefijo 34, o el enlace wa.me.",
  },
  {
    id: "instagram",
    label: "Instagram",
    blurb: "Se abre tu perfil.",
    placeholder: "https://instagram.com/tu_cuenta",
    hint: "@cuenta o el enlace de Instagram.",
  },
];

export const MODEL_LABEL: Record<FaceModel, string> = {
  google: "Google",
  whatsapp: "WhatsApp",
  instagram: "Instagram",
  personalizada: "Con logo",
};

/** Lo que costarían dos unidades sueltas, sin pack. */
export function packWas(kind: ProductKind) {
  return PRICES[kind][1] * 2;
}

/** 5 € en genérica y personalizada al llevar dos. */
export function packSaving(kind: ProductKind, qty: Qty) {
  if (qty !== 2 || kind === "unica") return 0;
  return packWas(kind) - PRICES[kind][2];
}

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

export const KIND_META: Record<ProductKind, { label: string; short: string }> = {
  generica: { label: "Genérica", short: "Google, WhatsApp o Instagram" },
  personalizada: { label: "Con tu logo", short: "Tu marca" },
  unica: { label: "Pieza única", short: "Tu negocio · 2 NFC" },
};

export function isCatalogModel(value: unknown): value is CatalogModel {
  return value === "google" || value === "whatsapp" || value === "instagram";
}

export function isFaceModel(value: unknown): value is FaceModel {
  return isCatalogModel(value) || value === "personalizada";
}

export function needsLogo(kind: ProductKind) {
  return kind !== "generica";
}

export function qtysFor(kind: ProductKind): Qty[] {
  return kind === "unica" ? [1] : [1, 2];
}

export function parseKind(value: unknown, allowUnica = false): ProductKind {
  if (value === "generica" || value === "personalizada") return value;
  if (allowUnica && value === "unica") return value;
  return "generica";
}

export function parseModels(value: unknown): CatalogModel[] {
  const raw = Array.isArray(value) ? value.join(",") : String(value || "");
  const ids = raw
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter(isCatalogModel);
  const unique: CatalogModel[] = [];
  for (const id of ids) {
    if (!unique.includes(id)) unique.push(id);
  }
  return unique.slice(0, 2);
}

export function kindsFor(admin: boolean): ProductKind[] {
  return admin ? ["generica", "personalizada", "unica"] : ["generica", "personalizada"];
}

export function productLabel(kind: ProductKind, qty: Qty, pieces?: OrderPiece[]) {
  const fromPieces = piecesLabel(pieces);
  if (fromPieces) return fromPieces;
  const base = KIND_META[kind].label;
  if (kind === "unica") return base;
  return qty === 2 ? `${base} × 2` : `${base} × 1`;
}

export function piecesLabel(pieces?: OrderPiece[] | null) {
  if (!pieces?.length) return "";
  return pieces.map((p) => MODEL_LABEL[p.model] || p.model).join(" + ");
}

export function orderPieces(order: Pick<Order, "kind" | "qty" | "design">): OrderPiece[] {
  const listed = (order.design.pieces || []).filter(
    (p) => isFaceModel(p.model) && typeof p.nfcUrl === "string" && p.nfcUrl.trim(),
  );
  if (listed.length) return listed.slice(0, 2);
  const first: OrderPiece = {
    model:
      order.design.model && isFaceModel(order.design.model)
        ? order.design.model
        : order.kind === "generica"
          ? "google"
          : "personalizada",
    nfcUrl: (order.design.googleUrl || "").trim(),
  };
  if (order.qty === 2 && order.design.extraUrl?.trim() && order.kind !== "unica") {
    return [
      first,
      {
        model: isCatalogModel(order.design.model) ? order.design.model : first.model,
        nfcUrl: order.design.extraUrl.trim(),
      },
    ];
  }
  return [first];
}

export function defaultDesign(kind: ProductKind, model: FaceModel = kind === "generica" ? "google" : "personalizada"): CardDesign {
  return {
    kind,
    model,
    template: "clasica",
    bodyColor: "negro",
    accentColor: "amarillo",
    line1: "",
    line2: "",
    googleUrl: "",
    extraUrl: "",
    pieces: [{ model, nfcUrl: "" }],
  };
}

export function designForModel(model: FaceModel, base?: CardDesign): CardDesign {
  const kind: ProductKind = model === "personalizada" ? "personalizada" : "generica";
  return {
    ...(base || defaultDesign(kind, model)),
    kind,
    model,
  };
}
