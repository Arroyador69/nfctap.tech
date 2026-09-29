import { createHmac } from "crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "fs";
import { cookies } from "next/headers";
import { tmpdir } from "os";
import path from "path";
import { clientIpFromHeaders } from "@/lib/lista";

export { clientIpFromHeaders };

const BLOB_KEY = "nfctab-taller.json";
const ID_RE = /^[a-z0-9-]{3,32}$/;
const COOKIE_PREFIX = "taller_home_";

/** Filamento PLA · pegamentos · boquillas/cama · cajas/cinta envíos. */
export type TallerSection = "filamento" | "adhesivos" | "recambios" | "embalaje";
export type TallerUnit = "uds" | "bobinas" | "ml";
export type TallerColor = "" | "negro" | "blanco" | "amarillo" | "otro";

export const TALLER_SECTIONS: TallerSection[] = [
  "filamento",
  "adhesivos",
  "recambios",
  "embalaje",
];

export function tallerSectionLabel(s: TallerSection) {
  switch (s) {
    case "adhesivos":
      return "Adhesivos";
    case "recambios":
      return "Recambios";
    case "embalaje":
      return "Embalaje";
    default:
      return "Filamento";
  }
}

export function normalizeTallerSection(raw: unknown): TallerSection {
  if (raw === "adhesivos" || raw === "recambios" || raw === "embalaje") return raw;
  return "filamento";
}

export function normalizeTallerUnit(raw: unknown): TallerUnit {
  if (raw === "bobinas" || raw === "ml") return raw;
  return "uds";
}

export function normalizeTallerColor(raw: unknown): TallerColor {
  if (raw === "negro" || raw === "blanco" || raw === "amarillo" || raw === "otro") return raw;
  return "";
}

export type TallerItem = {
  id: string;
  text: string;
  qty: number;
  unit: TallerUnit;
  section: TallerSection;
  /** Color PLA (útil en filamento AD5X). */
  color: TallerColor;
  done: boolean;
  updatedAt: string;
};

export type Taller = {
  id: string;
  title: string;
  items: TallerItem[];
  updatedAt: string;
};

type HomeGate = {
  ips: string[];
  updatedAt: string;
};

type TallerStore = {
  lists: Record<string, Taller>;
  homes: Record<string, HomeGate>;
};

export type TallerAccess =
  | { ok: true; ip: string }
  | { ok: false; reason: "fuera_casa" | "sin_activar"; ip: string };

function emptyStore(): TallerStore {
  return { lists: {}, homes: {} };
}

function filePath() {
  if (process.env.VERCEL) return path.join(tmpdir(), "nfctab-taller.json");
  return path.join(process.cwd(), "data", "taller.json");
}

function emptyTaller(id: string): Taller {
  const now = new Date().toISOString();
  return { id, title: "Material taller", items: [], updatedAt: now };
}

export function tallerIdOk(id: string) {
  return ID_RE.test(id);
}

function normalizeIp(raw: string) {
  let ip = raw.trim().replace(/^\[|\]$/g, "");
  if (ip.startsWith("::ffff:")) ip = ip.slice(7);
  return ip;
}

function isLocalIp(ip: string) {
  if (!ip) return false;
  if (ip === "127.0.0.1" || ip === "::1" || ip === "localhost") return true;
  if (ip.startsWith("192.168.") || ip.startsWith("10.")) return true;
  if (/^172\.(1[6-9]|2\d|3[0-1])\./.test(ip)) return true;
  return false;
}

function homeSecret() {
  return (
    process.env.LISTA_HOME_SECRET ||
    process.env.DASHBOARD_SECRET ||
    process.env.DASHBOARD_PASSWORD ||
    "nfctab"
  );
}

function homeSecretOk(input: string) {
  const expected = process.env.LISTA_HOME_SECRET || process.env.DASHBOARD_PASSWORD || "nfctab";
  return Boolean(input) && input === expected;
}

export const TALLER_HOME_COOKIE_MAX_AGE = 60 * 60 * 24 * 400;

export function tallerHomeCookieName(id: string) {
  return `${COOKIE_PREFIX}${id}`;
}

export function tallerHomeCookieValue(id: string) {
  return createHmac("sha256", homeSecret()).update(`taller:${id}`).digest("hex").slice(0, 32);
}

export function tallerHomeCookieOptions() {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: TALLER_HOME_COOKIE_MAX_AGE,
  };
}

export async function hasTallerHomeCookie(id: string) {
  const jar = await cookies();
  return jar.get(tallerHomeCookieName(id))?.value === tallerHomeCookieValue(id);
}

async function readBlob(): Promise<TallerStore | null> {
  if (!process.env.BLOB_READ_WRITE_TOKEN) return null;
  try {
    const { get, list } = await import("@vercel/blob");
    const byPath = await get(BLOB_KEY, { access: "private" });
    if (byPath?.statusCode === 200 && byPath.stream) {
      const text = await new Response(byPath.stream).text();
      const raw = JSON.parse(text) as Partial<TallerStore>;
      return { lists: raw.lists || {}, homes: raw.homes || {} };
    }
    const { blobs } = await list({ prefix: BLOB_KEY, limit: 5 });
    const hit = blobs.find((b) => b.pathname === BLOB_KEY || b.pathname.endsWith(BLOB_KEY));
    if (!hit) return null;
    const byUrl = await get(hit.url, { access: "private" });
    if (!byUrl || byUrl.statusCode !== 200 || !byUrl.stream) return null;
    const text = await new Response(byUrl.stream).text();
    const raw = JSON.parse(text) as Partial<TallerStore>;
    return { lists: raw.lists || {}, homes: raw.homes || {} };
  } catch {
    return null;
  }
}

async function writeBlob(data: TallerStore) {
  const { put } = await import("@vercel/blob");
  await put(BLOB_KEY, JSON.stringify(data), {
    access: "private",
    addRandomSuffix: false,
    allowOverwrite: true,
    contentType: "application/json",
    cacheControlMaxAge: 0,
  });
}

function readDisk(): TallerStore | null {
  try {
    const p = filePath();
    if (!existsSync(p)) return null;
    const raw = JSON.parse(readFileSync(p, "utf8")) as Partial<TallerStore>;
    return { lists: raw.lists || {}, homes: raw.homes || {} };
  } catch {
    return null;
  }
}

function writeDisk(data: TallerStore) {
  try {
    const p = filePath();
    mkdirSync(path.dirname(p), { recursive: true });
    writeFileSync(p, JSON.stringify(data, null, 2));
  } catch {
    /* ok */
  }
}

declare global {
  var __nfctab_taller: TallerStore | undefined;
}

async function load(): Promise<TallerStore> {
  if (process.env.BLOB_READ_WRITE_TOKEN) {
    const fromBlob = await readBlob();
    const mem = globalThis.__nfctab_taller;
    if (fromBlob) {
      if (mem?.homes) {
        for (const [k, v] of Object.entries(mem.homes)) {
          const blobHome = fromBlob.homes[k];
          if (!blobHome || blobHome.ips.length < v.ips.length) {
            fromBlob.homes[k] = v;
          }
        }
      }
      if (mem?.lists) {
        for (const [k, v] of Object.entries(mem.lists)) {
          const blobList = fromBlob.lists[k];
          if (!blobList || v.updatedAt > (blobList.updatedAt || "")) {
            fromBlob.lists[k] = v;
          }
        }
      }
      globalThis.__nfctab_taller = fromBlob;
      return fromBlob;
    }
    return mem ?? emptyStore();
  }
  if (!globalThis.__nfctab_taller) {
    globalThis.__nfctab_taller = readDisk() ?? emptyStore();
  }
  return globalThis.__nfctab_taller;
}

async function persist(data: TallerStore) {
  globalThis.__nfctab_taller = data;
  if (process.env.BLOB_READ_WRITE_TOKEN) {
    await writeBlob(data);
    return;
  }
  if (process.env.VERCEL) {
    throw new Error(
      "Falta BLOB_READ_WRITE_TOKEN en Vercel. Sin Blob el taller no se guarda al recargar.",
    );
  }
  writeDisk(data);
}

function cleanText(raw: string) {
  return raw.replace(/\s+/g, " ").trim().slice(0, 80);
}

function clampQty(n: unknown, unit: TallerUnit = "uds") {
  const v = typeof n === "number" ? n : Number(n);
  if (!Number.isFinite(v)) return unit === "ml" ? 50 : 1;
  if (unit === "ml") return Math.min(5000, Math.max(1, Math.round(v)));
  if (unit === "bobinas") return Math.min(40, Math.max(1, Math.round(v)));
  return Math.min(99, Math.max(1, Math.round(v)));
}

export function normalizeTallerItem(
  raw: Partial<TallerItem> & { id: string; text: string },
): TallerItem {
  const unit = normalizeTallerUnit(raw.unit);
  return {
    id: raw.id,
    text: raw.text,
    qty: clampQty(raw.qty ?? 1, unit),
    unit,
    section: normalizeTallerSection(raw.section),
    color: normalizeTallerColor(raw.color),
    done: Boolean(raw.done),
    updatedAt: raw.updatedAt || new Date().toISOString(),
  };
}

function normalizeTaller(t: Taller): Taller {
  return {
    ...t,
    items: (t.items || []).map((it) =>
      normalizeTallerItem(it as Partial<TallerItem> & { id: string; text: string }),
    ),
  };
}

export async function assertTallerHome(id: string, ip: string): Promise<TallerAccess> {
  const normalized = normalizeIp(ip);
  if (await hasTallerHomeCookie(id)) {
    return { ok: true, ip: normalized || "cookie" };
  }
  if (process.env.NODE_ENV !== "production" && isLocalIp(normalized || "127.0.0.1")) {
    return { ok: true, ip: normalized || "127.0.0.1" };
  }
  const data = await load();
  const home = data.homes[id];
  if (!home) {
    return { ok: false, reason: "sin_activar", ip: normalized };
  }
  if (normalized && home.ips.includes(normalized)) {
    return { ok: true, ip: normalized };
  }
  if (home.ips.length === 0) {
    return { ok: false, reason: "sin_activar", ip: normalized };
  }
  return { ok: false, reason: "fuera_casa", ip: normalized };
}

export async function registerTallerHome(
  id: string,
  ip: string,
  secret: string,
): Promise<{ ok: true; ip: string } | { ok: false; error: string }> {
  if (!tallerIdOk(id)) return { ok: false, error: "id inválido" };
  if (!homeSecretOk(secret)) {
    return { ok: false, error: "Clave incorrecta. Usa la misma que el dashboard." };
  }
  try {
    const data = await load();
    const now = new Date().toISOString();
    const normalized = normalizeIp(ip);
    const prev = data.homes[id]?.ips || [];
    let ips = [...prev];
    if (normalized && !isLocalIp(normalized)) {
      ips = [normalized, ...prev.filter((p) => p !== normalized)].slice(0, 5);
    }
    data.homes[id] = { ips, updatedAt: now };
    if (!data.lists[id]) data.lists[id] = emptyTaller(id);
    await persist(data);
    return { ok: true, ip: normalized || "cookie" };
  } catch {
    return {
      ok: false,
      error: "No se pudo guardar. Revisa que Blob esté configurado en Vercel.",
    };
  }
}

export async function getTaller(id: string): Promise<Taller> {
  const data = await load();
  return normalizeTaller(data.lists[id] ?? emptyTaller(id));
}

export function tallerPublicView(t: Taller) {
  const normalized = normalizeTaller(t);
  return {
    id: normalized.id,
    title: normalized.title,
    updatedAt: normalized.updatedAt,
    items: normalized.items.map((it) => ({
      id: it.id,
      text: it.text,
      qty: it.qty,
      unit: it.unit,
      section: it.section,
      color: it.color,
      done: it.done,
    })),
  };
}

export function formatTallerQty(qty: number, unit: TallerUnit) {
  if (unit === "ml") return `${qty} ml`;
  if (unit === "bobinas") return qty > 1 ? `${qty} bobinas` : "1 bobina";
  return qty > 1 ? `×${qty}` : "";
}

export function formatTallerColor(c: TallerColor) {
  if (!c) return "";
  return c;
}

export async function addTallerItem(
  id: string,
  text: string,
  qty = 1,
  opts?: { section?: TallerSection; unit?: TallerUnit; color?: TallerColor },
): Promise<Taller> {
  const t = cleanText(text);
  if (!t) throw new Error("texto vacío");
  const section = normalizeTallerSection(opts?.section);
  const unit = normalizeTallerUnit(opts?.unit);
  const color = section === "filamento" ? normalizeTallerColor(opts?.color) : "";
  const data = await load();
  const taller = normalizeTaller(data.lists[id] ?? emptyTaller(id));
  const now = new Date().toISOString();
  const existing = taller.items.find(
    (it) =>
      !it.done &&
      it.section === section &&
      it.unit === unit &&
      it.color === color &&
      it.text.toLocaleLowerCase("es") === t.toLocaleLowerCase("es"),
  );
  if (existing) {
    existing.qty = clampQty(existing.qty + clampQty(qty, unit), unit);
    existing.updatedAt = now;
  } else {
    taller.items.unshift({
      id: `t_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`,
      text: t,
      qty: clampQty(qty, unit),
      unit,
      section,
      color,
      done: false,
      updatedAt: now,
    });
  }
  taller.updatedAt = now;
  data.lists[id] = taller;
  await persist(data);
  return taller;
}

export async function patchTallerItem(
  id: string,
  itemId: string,
  patch: {
    qty?: number;
    done?: boolean;
    text?: string;
    unit?: TallerUnit;
    section?: TallerSection;
    color?: TallerColor;
  },
): Promise<Taller> {
  const data = await load();
  const taller = normalizeTaller(data.lists[id] ?? emptyTaller(id));
  const item = taller.items.find((it) => it.id === itemId);
  if (!item) throw new Error("ítem no encontrado");
  const now = new Date().toISOString();
  if (patch.unit !== undefined) item.unit = normalizeTallerUnit(patch.unit);
  if (patch.section !== undefined) item.section = normalizeTallerSection(patch.section);
  if (patch.color !== undefined) {
    item.color = item.section === "filamento" ? normalizeTallerColor(patch.color) : "";
  }
  if (item.section !== "filamento") item.color = "";
  if (patch.qty !== undefined) item.qty = clampQty(patch.qty, item.unit);
  if (patch.done !== undefined) item.done = Boolean(patch.done);
  if (patch.text !== undefined) {
    const t = cleanText(patch.text);
    if (!t) throw new Error("texto vacío");
    item.text = t;
  }
  item.updatedAt = now;
  taller.updatedAt = now;
  data.lists[id] = taller;
  await persist(data);
  return taller;
}

export async function removeTallerItem(id: string, itemId: string): Promise<Taller> {
  const data = await load();
  const taller = data.lists[id] ?? emptyTaller(id);
  taller.items = taller.items.filter((it) => it.id !== itemId);
  taller.updatedAt = new Date().toISOString();
  data.lists[id] = taller;
  await persist(data);
  return taller;
}

export async function clearDoneTaller(id: string): Promise<Taller> {
  const data = await load();
  const taller = data.lists[id] ?? emptyTaller(id);
  taller.items = taller.items.filter((it) => !it.done);
  taller.updatedAt = new Date().toISOString();
  data.lists[id] = taller;
  await persist(data);
  return taller;
}

export function tallerItemLine(
  it: Pick<TallerItem, "text" | "qty" | "unit" | "color" | "section">,
) {
  const q = formatTallerQty(it.qty, it.unit);
  const color = it.section === "filamento" && it.color ? ` (${it.color})` : "";
  return q ? `• ${it.text}${color} ${q}` : `• ${it.text}${color}`;
}

export function tallerShareText(t: Taller) {
  const pending = normalizeTaller(t).items.filter((it) => !it.done);
  if (!pending.length) return "Nada pendiente de comprar.";
  const by = TALLER_SECTIONS.map((s) => ({
    s,
    items: pending.filter((it) => it.section === s),
  })).filter((g) => g.items.length);
  const lines = ["Material taller · NFCTap"];
  for (const g of by) {
    lines.push("", tallerSectionLabel(g.s));
    for (const it of g.items) lines.push(tallerItemLine(it));
  }
  return lines.join("\n");
}
