import { newId } from "./ids";
import { clampQty, MAX_QTY, MODEL_LABEL, productPrice } from "./catalog";
import type { AccentColor, BodyColor, CartLine, FaceModel, OrderLine, ProductKind } from "./types";

const STORAGE_KEY = "nfctap_cart";
const COOKIE = "nfctap_cart";
const MAX_AGE = 60 * 60 * 24 * 7;
const EVENT = "nfctap-cart";

export type { CartLine } from "./types";

type CartBlob = { v: 1; lines: CartLine[] };

let snapshot: CartLine[] = [];
let snapshotRaw = "";
const EMPTY: CartLine[] = [];

function emit() {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new Event(EVENT));
}

function readStorage(): CartLine[] {
  if (typeof window === "undefined") return EMPTY;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY) || "";
    if (raw === snapshotRaw) return snapshot;
    snapshotRaw = raw;
    if (!raw) {
      snapshot = EMPTY;
      return snapshot;
    }
    const parsed = JSON.parse(raw) as CartBlob;
    if (parsed?.v !== 1 || !Array.isArray(parsed.lines)) {
      snapshot = EMPTY;
      return snapshot;
    }
    snapshot = parsed.lines.filter(isCartLine);
    return snapshot;
  } catch {
    snapshot = EMPTY;
    snapshotRaw = "";
    return snapshot;
  }
}

function writeStorage(lines: CartLine[]) {
  if (typeof window === "undefined") return;
  snapshot = lines.length ? lines : EMPTY;
  const blob: CartBlob = { v: 1, lines };
  const raw = JSON.stringify(blob);
  snapshotRaw = raw;
  try {
    window.localStorage.setItem(STORAGE_KEY, raw);
  } catch {
    /* cuota / privado */
  }
  writeCookie(lines);
  emit();
}

function writeCookie(lines: CartLine[]) {
  if (typeof document === "undefined") return;
  const safe = lines.map((l) => ({
    id: l.id,
    kind: l.kind,
    model: l.model,
    qty: l.qty,
    bodyColor: l.bodyColor,
    accentColor: l.accentColor,
    nfcUrl: l.kind === "wifi" ? "" : l.nfcUrl,
    line1: l.line1,
    wifiSsid: l.wifiSsid,
    wifiOpen: l.wifiOpen,
  }));
  const value = encodeURIComponent(JSON.stringify({ v: 1, n: cartCount(lines), lines: safe }));
  if (value.length > 3500) {
    document.cookie = `${COOKIE}=${cartCount(lines)}; Path=/; Max-Age=${MAX_AGE}; SameSite=Lax`;
    return;
  }
  document.cookie = `${COOKIE}=${value}; Path=/; Max-Age=${MAX_AGE}; SameSite=Lax`;
}

const KINDS: ProductKind[] = ["generica", "personalizada", "wifi"];
const MODELS: FaceModel[] = ["google", "whatsapp", "instagram", "personalizada", "wifi"];
const BODIES: BodyColor[] = ["negro", "blanco", "rojo"];
const ACCENTS: AccentColor[] = ["oro", "amarillo", "blanco", "rojo", "negro"];

export function isCartLine(value: unknown): value is CartLine {
  if (!value || typeof value !== "object") return false;
  const v = value as CartLine;
  return (
    KINDS.includes(v.kind) &&
    MODELS.includes(v.model) &&
    BODIES.includes(v.bodyColor) &&
    ACCENTS.includes(v.accentColor) &&
    typeof v.nfcUrl === "string" &&
    Number.isFinite(v.qty)
  );
}

export function loadCart(): CartLine[] {
  return readStorage();
}

export function emptyCart(): CartLine[] {
  return EMPTY;
}

export function cartCount(lines: CartLine[] = readStorage()) {
  return lines.reduce((n, l) => n + clampQty(l.qty, 0), 0);
}

export function cartQtyByKind(lines: Pick<CartLine, "kind" | "qty">[], kind: ProductKind) {
  return lines.filter((l) => l.kind === kind).reduce((n, l) => n + clampQty(l.qty, 0), 0);
}

/** Primera + extra por tipo (Google/WA/IG juntas; logo aparte; Wi‑Fi 15 €). */
export function cartGoodsPrice(lines: Pick<CartLine, "kind" | "qty">[]) {
  return (
    productPrice("generica", cartQtyByKind(lines, "generica")) +
    productPrice("personalizada", cartQtyByKind(lines, "personalizada")) +
    productPrice("wifi", cartQtyByKind(lines, "wifi"))
  );
}

export function polarFromCart(lines: Pick<CartLine, "kind" | "qty">[]) {
  const g = cartQtyByKind(lines, "generica");
  const c = cartQtyByKind(lines, "personalizada");
  const w = cartQtyByKind(lines, "wifi");
  if (g + c === 0) return { kind: "wifi" as const, qty: Math.max(1, w) };
  if (g === 0) return { kind: "personalizada" as const, qty: Math.max(1, c) };
  return { kind: "generica" as const, qty: Math.max(1, g + c) };
}

export function lineLabel(line: CartLine) {
  const name = MODEL_LABEL[line.model] || line.kind;
  return line.qty > 1 ? `${name} × ${line.qty}` : name;
}

export function addCartLines(incoming: CartLine[]) {
  const current = readStorage();
  let used = cartCount(current);
  const next = [...current];
  for (const raw of incoming) {
    const qty = clampQty(raw.qty);
    if (used + qty > MAX_QTY) break;
    const merged = next.find(
      (l) =>
        l.kind === raw.kind &&
        l.model === raw.model &&
        l.nfcUrl === raw.nfcUrl &&
        l.bodyColor === raw.bodyColor &&
        l.accentColor === raw.accentColor &&
        l.wifiSsid === raw.wifiSsid &&
        l.wifiOpen === raw.wifiOpen &&
        !raw.logoDataUrl &&
        !l.logoDataUrl,
    );
    if (merged) {
      const add = Math.min(qty, MAX_QTY - used);
      merged.qty += add;
      used += add;
    } else {
      next.push({ ...raw, id: raw.id || newId(), qty });
      used += qty;
    }
  }
  writeStorage(next);
  return next;
}

export function setCartLineQty(id: string, qty: number) {
  const next = readStorage()
    .map((l) => (l.id === id ? { ...l, qty: clampQty(qty, 0) } : l))
    .filter((l) => l.qty > 0);
  const total = cartCount(next);
  if (total > MAX_QTY) return readStorage();
  writeStorage(next);
  return next;
}

export function removeCartLine(id: string) {
  const next = readStorage().filter((l) => l.id !== id);
  writeStorage(next);
  return next;
}

export function clearCart() {
  writeStorage([]);
  if (typeof document !== "undefined") {
    document.cookie = `${COOKIE}=; Path=/; Max-Age=0; SameSite=Lax`;
  }
}

export function subscribeCart(onChange: () => void) {
  if (typeof window === "undefined") return () => {};
  window.addEventListener(EVENT, onChange);
  window.addEventListener("storage", onChange);
  return () => {
    window.removeEventListener(EVENT, onChange);
    window.removeEventListener("storage", onChange);
  };
}

export function toOrderLines(lines: CartLine[]): OrderLine[] {
  return lines.map((l) => ({
    id: l.id,
    kind: l.kind,
    model: l.model,
    qty: clampQty(l.qty),
    bodyColor: l.bodyColor,
    accentColor: l.accentColor,
    nfcUrl: l.nfcUrl,
    line1: l.line1,
    logoDataUrl: l.logoDataUrl,
    logoMask: l.logoMask,
    wifiSsid: l.wifiSsid,
    wifiPassword: l.wifiPassword,
    wifiOpen: l.wifiOpen,
  }));
}
