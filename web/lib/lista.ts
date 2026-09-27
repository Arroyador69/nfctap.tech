import { createHmac } from "crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "fs";
import { cookies } from "next/headers";
import { tmpdir } from "os";
import path from "path";

const BLOB_KEY = "nfctab-listas.json";
const ID_RE = /^[a-z0-9-]{3,32}$/;
const COOKIE_PREFIX = "lista_home_";

export type ListaItem = {
  id: string;
  text: string;
  qty: number;
  done: boolean;
  updatedAt: string;
};

export type Lista = {
  id: string;
  title: string;
  items: ListaItem[];
  updatedAt: string;
};

type HomeGate = {
  ips: string[];
  updatedAt: string;
};

type ListaStore = {
  lists: Record<string, Lista>;
  homes: Record<string, HomeGate>;
};

export type ListaAccess =
  | { ok: true; ip: string }
  | { ok: false; reason: "fuera_casa" | "sin_activar"; ip: string };

function emptyStore(): ListaStore {
  return { lists: {}, homes: {} };
}

function filePath() {
  if (process.env.VERCEL) return path.join(tmpdir(), "nfctab-listas.json");
  return path.join(process.cwd(), "data", "listas.json");
}

function emptyLista(id: string): Lista {
  const now = new Date().toISOString();
  return { id, title: "Lista de la compra", items: [], updatedAt: now };
}

export function listaIdOk(id: string) {
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

/** IP pública del visitante (Vercel / proxy). */
export function clientIpFromHeaders(h: Headers): string {
  const fwd = h.get("x-forwarded-for") || "";
  const first = fwd.split(",")[0]?.trim();
  if (first) return normalizeIp(first);
  const real = h.get("x-real-ip") || h.get("cf-connecting-ip") || "";
  return normalizeIp(real);
}

function homeSecret() {
  return (
    process.env.LISTA_HOME_SECRET ||
    process.env.DASHBOARD_SECRET ||
    process.env.DASHBOARD_PASSWORD ||
    "nfctab"
  );
}

/** Misma clave que el dashboard (DASHBOARD_PASSWORD o nfctab por defecto). */
function homeSecretOk(input: string) {
  const expected = process.env.LISTA_HOME_SECRET || process.env.DASHBOARD_PASSWORD || "nfctab";
  return Boolean(input) && input === expected;
}

export const LISTA_HOME_COOKIE_MAX_AGE = 60 * 60 * 24 * 400;

export function listaHomeCookieName(id: string) {
  return `${COOKIE_PREFIX}${id}`;
}

export function listaHomeCookieValue(id: string) {
  return createHmac("sha256", homeSecret()).update(`lista:${id}`).digest("hex").slice(0, 32);
}

export function listaHomeCookieOptions() {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: LISTA_HOME_COOKIE_MAX_AGE,
  };
}

export async function setListaHomeCookie(id: string) {
  const jar = await cookies();
  jar.set(listaHomeCookieName(id), listaHomeCookieValue(id), listaHomeCookieOptions());
}

export async function hasListaHomeCookie(id: string) {
  const jar = await cookies();
  return jar.get(listaHomeCookieName(id))?.value === listaHomeCookieValue(id);
}

async function readBlob(): Promise<ListaStore | null> {
  if (!process.env.BLOB_READ_WRITE_TOKEN) return null;
  try {
    const { list } = await import("@vercel/blob");
    const { blobs } = await list({ prefix: BLOB_KEY, limit: 5 });
    const hit = blobs.find((b) => b.pathname === BLOB_KEY || b.pathname.endsWith(BLOB_KEY));
    if (!hit) return null;
    const bust = hit.url.includes("?") ? `&_=${Date.now()}` : `?_=${Date.now()}`;
    const res = await fetch(`${hit.url}${bust}`, { cache: "no-store" });
    if (!res.ok) return null;
    const raw = (await res.json()) as Partial<ListaStore>;
    return { lists: raw.lists || {}, homes: raw.homes || {} };
  } catch {
    return null;
  }
}

async function writeBlob(data: ListaStore) {
  const { put } = await import("@vercel/blob");
  await put(BLOB_KEY, JSON.stringify(data), {
    access: "private",
    addRandomSuffix: false,
    allowOverwrite: true,
    cacheControlMaxAge: 0,
  });
}

function readDisk(): ListaStore | null {
  try {
    const p = filePath();
    if (!existsSync(p)) return null;
    const raw = JSON.parse(readFileSync(p, "utf8")) as Partial<ListaStore>;
    return { lists: raw.lists || {}, homes: raw.homes || {} };
  } catch {
    return null;
  }
}

function writeDisk(data: ListaStore) {
  try {
    const p = filePath();
    mkdirSync(path.dirname(p), { recursive: true });
    writeFileSync(p, JSON.stringify(data, null, 2));
  } catch {
    /* Vercel /tmp o disco local */
  }
}

declare global {
  var __nfctab_listas: ListaStore | undefined;
}

async function load(): Promise<ListaStore> {
  if (process.env.BLOB_READ_WRITE_TOKEN) {
    const fromBlob = await readBlob();
    if (fromBlob) {
      const mem = globalThis.__nfctab_listas;
      // Si la memoria de esta instancia tiene casas y el blob aún no, no las pierdas.
      if (mem?.homes) {
        for (const [k, v] of Object.entries(mem.homes)) {
          const blobHome = fromBlob.homes[k];
          if (!blobHome || blobHome.ips.length < v.ips.length) {
            fromBlob.homes[k] = v;
          }
        }
      }
      globalThis.__nfctab_listas = fromBlob;
      return fromBlob;
    }
    return globalThis.__nfctab_listas ?? emptyStore();
  }
  if (!globalThis.__nfctab_listas) {
    globalThis.__nfctab_listas = readDisk() ?? emptyStore();
  }
  return globalThis.__nfctab_listas;
}

async function persist(data: ListaStore) {
  globalThis.__nfctab_listas = data;
  if (process.env.BLOB_READ_WRITE_TOKEN) {
    await writeBlob(data);
    return;
  }
  writeDisk(data);
}

function cleanText(raw: string) {
  return raw.replace(/\s+/g, " ").trim().slice(0, 80);
}

function clampQty(n: unknown) {
  const v = typeof n === "number" ? n : Number(n);
  if (!Number.isFinite(v)) return 1;
  return Math.min(99, Math.max(1, Math.round(v)));
}

/** Acceso: cookie de este dispositivo, o misma IP pública del router. */
export async function assertListaHome(id: string, ip: string): Promise<ListaAccess> {
  const normalized = normalizeIp(ip);
  if (await hasListaHomeCookie(id)) {
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
    // Misma Wi‑Fi de casa: deja cookie para este navegador también.
    await setListaHomeCookie(id);
    return { ok: true, ip: normalized };
  }
  if (home.ips.length === 0) {
    return { ok: false, reason: "sin_activar", ip: normalized };
  }
  return { ok: false, reason: "fuera_casa", ip: normalized };
}

/** Activa este dispositivo (cookie) y, si hay IP pública, la guarda como «casa». */
export async function registerListaHome(
  id: string,
  ip: string,
  secret: string,
): Promise<{ ok: true; ip: string } | { ok: false; error: string }> {
  if (!listaIdOk(id)) return { ok: false, error: "id inválido" };
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
    if (!data.lists[id]) data.lists[id] = emptyLista(id);
    await persist(data);
    await setListaHomeCookie(id);
    return { ok: true, ip: normalized || "cookie" };
  } catch {
    return {
      ok: false,
      error: "No se pudo guardar. Revisa que Blob esté configurado en Vercel.",
    };
  }
}

export async function getLista(id: string): Promise<Lista> {
  const data = await load();
  return data.lists[id] ?? emptyLista(id);
}

export async function addListaItem(id: string, text: string, qty = 1): Promise<Lista> {
  const t = cleanText(text);
  if (!t) throw new Error("texto vacío");
  const data = await load();
  const lista = data.lists[id] ?? emptyLista(id);
  const now = new Date().toISOString();
  const existing = lista.items.find(
    (it) => !it.done && it.text.toLocaleLowerCase("es") === t.toLocaleLowerCase("es"),
  );
  if (existing) {
    existing.qty = clampQty(existing.qty + clampQty(qty));
    existing.updatedAt = now;
  } else {
    lista.items.unshift({
      id: `i_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`,
      text: t,
      qty: clampQty(qty),
      done: false,
      updatedAt: now,
    });
  }
  lista.updatedAt = now;
  data.lists[id] = lista;
  await persist(data);
  return lista;
}

export async function patchListaItem(
  id: string,
  itemId: string,
  patch: { qty?: number; done?: boolean; text?: string },
): Promise<Lista> {
  const data = await load();
  const lista = data.lists[id] ?? emptyLista(id);
  const item = lista.items.find((it) => it.id === itemId);
  if (!item) throw new Error("ítem no encontrado");
  const now = new Date().toISOString();
  if (patch.qty !== undefined) item.qty = clampQty(patch.qty);
  if (patch.done !== undefined) item.done = Boolean(patch.done);
  if (patch.text !== undefined) {
    const t = cleanText(patch.text);
    if (!t) throw new Error("texto vacío");
    item.text = t;
  }
  item.updatedAt = now;
  lista.updatedAt = now;
  data.lists[id] = lista;
  await persist(data);
  return lista;
}

export async function removeListaItem(id: string, itemId: string): Promise<Lista> {
  const data = await load();
  const lista = data.lists[id] ?? emptyLista(id);
  lista.items = lista.items.filter((it) => it.id !== itemId);
  lista.updatedAt = new Date().toISOString();
  data.lists[id] = lista;
  await persist(data);
  return lista;
}

export async function clearDoneLista(id: string): Promise<Lista> {
  const data = await load();
  const lista = data.lists[id] ?? emptyLista(id);
  lista.items = lista.items.filter((it) => !it.done);
  lista.updatedAt = new Date().toISOString();
  data.lists[id] = lista;
  await persist(data);
  return lista;
}

export function listaShareText(lista: Lista) {
  const pending = lista.items.filter((it) => !it.done);
  if (!pending.length) return "Lista vacía.";
  const lines = pending.map((it) => (it.qty > 1 ? `• ${it.text} ×${it.qty}` : `• ${it.text}`));
  return `Lista de la compra\n${lines.join("\n")}`;
}
