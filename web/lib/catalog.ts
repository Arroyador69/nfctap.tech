import type {
  AccentColor,
  BodyColor,
  CardDesign,
  CatalogModel,
  FaceModel,
  Order,
  OrderPiece,
  ProductKind,
} from "./types";

export const BRAND = {
  name: "NFCTap",
  domain: "nfctap.tech",
  url: "https://nfctap.tech",
  legacyDomain: "nfctab.tech",
  tagline: "Toca. WhatsApp, Instagram o Google.",
  email: "contacto@nfctap.tech",
};

export const SOCIALS = [
  { id: "instagram", label: "Instagram", href: "https://www.instagram.com/nfctap.tech/" },
  { id: "tiktok", label: "TikTok", href: "https://www.tiktok.com/@nfctap.tech" },
  { id: "youtube", label: "YouTube", href: "https://www.youtube.com/@nfctap" },
  { id: "facebook", label: "Facebook", href: "https://www.facebook.com/profile.php?id=61594394069652" },
] as const;

/** Tope de un pedido web. Polar cobra el total (mismo SKU 1 / pack 2). */
export const MAX_QTY = 30;

export const PRICE = {
  generica: { first: 20, extra: 15 },
  personalizada: { first: 30, extra: 25 },
  unica: { first: 70, extra: 0 },
} as const;

/** Compat: una y pack de dos. El resto usa productPrice(). */
export const PRICES: Record<ProductKind, { 1: number; 2: number }> = {
  generica: { 1: PRICE.generica.first, 2: PRICE.generica.first + PRICE.generica.extra },
  personalizada: { 1: PRICE.personalizada.first, 2: PRICE.personalizada.first + PRICE.personalizada.extra },
  unica: { 1: PRICE.unica.first, 2: PRICE.unica.first },
};

export function productPrice(kind: ProductKind, qty: number) {
  const n = Math.max(0, Math.floor(qty));
  if (n < 1) return 0;
  if (kind === "unica") return PRICE.unica.first;
  const { first, extra } = PRICE[kind];
  return first + extra * (n - 1);
}

export type ModelCounts = Record<CatalogModel, number>;

export function emptyCounts(): ModelCounts {
  return { google: 0, whatsapp: 0, instagram: 0 };
}

export function countsFromModels(models: CatalogModel[]): ModelCounts {
  const c = emptyCounts();
  const list = models.length ? models.slice(0, MAX_QTY) : (["google"] as CatalogModel[]);
  for (const id of list) c[id] += 1;
  return c;
}

export function countTotal(counts: ModelCounts) {
  return counts.google + counts.whatsapp + counts.instagram;
}

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

export function clampQty(value: unknown, min = 1) {
  const n = Math.floor(Number(value));
  if (!Number.isFinite(n)) return min;
  return Math.min(MAX_QTY, Math.max(min, n));
}

export function piecesFromCounts(
  counts: ModelCounts,
  urls: Record<CatalogModel, string>,
): OrderPiece[] {
  const out: OrderPiece[] = [];
  for (const m of FACE_MODELS) {
    const n = Math.max(0, Math.floor(counts[m.id] || 0));
    for (let i = 0; i < n && out.length < MAX_QTY; i++) {
      out.push({ model: m.id, nfcUrl: urls[m.id] || "" });
    }
  }
  return out;
}

/** Lo que costarían sueltas, sin el descuento de unidades extra. */
export function packWas(kind: ProductKind, qty = 2) {
  if (kind === "unica") return PRICE.unica.first;
  return PRICE[kind].first * Math.max(1, Math.floor(qty));
}

/** 5 € por cada pieza a partir de la segunda. */
export function packSaving(kind: ProductKind, qty: number) {
  if (kind === "unica" || qty < 2) return 0;
  return PRICE[kind].first * qty - productPrice(kind, qty);
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

export function qtysFor(kind: ProductKind): number[] {
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
  return ids.slice(0, MAX_QTY);
}

export function kindsFor(admin: boolean): ProductKind[] {
  return admin ? ["generica", "personalizada", "unica"] : ["generica", "personalizada"];
}

export function productLabel(kind: ProductKind, qty: number, pieces?: OrderPiece[]) {
  const fromPieces = piecesLabel(pieces);
  if (fromPieces) return fromPieces;
  const base = KIND_META[kind].label;
  if (kind === "unica") return base;
  return `${base} × ${Math.max(1, qty)}`;
}

export function piecesLabel(pieces?: OrderPiece[] | null) {
  if (!pieces?.length) return "";
  const order: string[] = [];
  const n = new Map<string, number>();
  for (const p of pieces) {
    const k = MODEL_LABEL[p.model] || p.model;
    if (!n.has(k)) order.push(k);
    n.set(k, (n.get(k) || 0) + 1);
  }
  return order.map((k) => (n.get(k)! > 1 ? `${k} × ${n.get(k)}` : k)).join(" + ");
}

export function orderPieces(order: Pick<Order, "kind" | "qty" | "design">): OrderPiece[] {
  const listed = (order.design.pieces || []).filter(
    (p) => isFaceModel(p.model) && typeof p.nfcUrl === "string" && p.nfcUrl.trim(),
  );
  if (listed.length) return listed.slice(0, MAX_QTY);
  const first: OrderPiece = {
    model:
      order.design.model && isFaceModel(order.design.model)
        ? order.design.model
        : order.kind === "generica"
          ? "google"
          : "personalizada",
    nfcUrl: (order.design.googleUrl || "").trim(),
  };
  if (order.kind === "unica") {
    const extra = order.design.extraUrl?.trim();
    return extra ? [first, { model: "personalizada", nfcUrl: extra }] : [first];
  }
  if (order.qty === 2 && order.design.extraUrl?.trim()) {
    return [
      first,
      {
        model: isCatalogModel(order.design.model) ? order.design.model : first.model,
        nfcUrl: order.design.extraUrl.trim(),
      },
    ];
  }
  const n = clampQty(order.qty);
  return Array.from({ length: n }, () => ({ ...first }));
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
