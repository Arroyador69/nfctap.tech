import { createHmac } from "crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "fs";
import { cookies } from "next/headers";
import { tmpdir } from "os";
import path from "path";

const BLOB_KEY = "nfctab-listas.json";
const ID_RE = /^[a-z0-9-]{3,32}$/;
const COOKIE_PREFIX = "lista_home_";

/** Casa = comida/despensa · Limpieza = droguería / hogar. */
export type ListaSection = "casa" | "limpieza";

/** uds = piezas · g = gramos. */
export type ListaUnit = "uds" | "g";

export const LISTA_SECTIONS: ListaSection[] = ["casa", "limpieza"];

export function listaSectionLabel(s: ListaSection) {
  return s === "limpieza" ? "Limpieza" : "Casa";
}

export function normalizeListaSection(raw: unknown): ListaSection {
  return raw === "limpieza" ? "limpieza" : "casa";
}

export function normalizeListaUnit(raw: unknown): ListaUnit {
  return raw === "g" ? "g" : "uds";
}

export type ListaItem = {
  id: string;
  text: string;
  qty: number;
  unit: ListaUnit;
  section: ListaSection;
  done: boolean;
  updatedAt: string;
  /** URL privada de Vercel Blob (solo servidor). */
  photoUrl?: string;
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
    const { get, list } = await import("@vercel/blob");

    // Lectura fiable de Blob privado (fetch sin token fallaba → lista vacía al recargar).
    const byPath = await get(BLOB_KEY, { access: "private" });
    if (byPath?.statusCode === 200 && byPath.stream) {
      const text = await new Response(byPath.stream).text();
      const raw = JSON.parse(text) as Partial<ListaStore>;
      return { lists: raw.lists || {}, homes: raw.homes || {} };
    }

    const { blobs } = await list({ prefix: BLOB_KEY, limit: 5 });
    const hit = blobs.find((b) => b.pathname === BLOB_KEY || b.pathname.endsWith(BLOB_KEY));
    if (!hit) return null;
    const byUrl = await get(hit.url, { access: "private" });
    if (!byUrl || byUrl.statusCode !== 200 || !byUrl.stream) return null;
    const text = await new Response(byUrl.stream).text();
    const raw = JSON.parse(text) as Partial<ListaStore>;
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
    contentType: "application/json",
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
    const mem = globalThis.__nfctab_listas;
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
      globalThis.__nfctab_listas = fromBlob;
      return fromBlob;
    }
    return mem ?? emptyStore();
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
    // Releer no hace falta: memoria + Blob ya tienen lo mismo.
    return;
  }
  if (process.env.VERCEL) {
    throw new Error(
      "Falta BLOB_READ_WRITE_TOKEN en Vercel. Sin Blob la lista no se guarda al recargar.",
    );
  }
  writeDisk(data);
}

function cleanText(raw: string) {
  return raw.replace(/\s+/g, " ").trim().slice(0, 80);
}

function clampQty(n: unknown, unit: ListaUnit = "uds") {
  const v = typeof n === "number" ? n : Number(n);
  if (!Number.isFinite(v)) return unit === "g" ? 100 : 1;
  if (unit === "g") {
    // Gramos: de 1 g a 10 kg, redondeo a entero.
    return Math.min(10000, Math.max(1, Math.round(v)));
  }
  return Math.min(99, Math.max(1, Math.round(v)));
}

/** Normaliza ítems antiguos (sin section/unit) al leer. */
export function normalizeListaItem(raw: Partial<ListaItem> & { id: string; text: string }): ListaItem {
  const unit = normalizeListaUnit(raw.unit);
  return {
    id: raw.id,
    text: raw.text,
    qty: clampQty(raw.qty ?? 1, unit),
    unit,
    section: normalizeListaSection(raw.section),
    done: Boolean(raw.done),
    updatedAt: raw.updatedAt || new Date().toISOString(),
    ...(raw.photoUrl ? { photoUrl: raw.photoUrl } : {}),
  };
}

function normalizeLista(lista: Lista): Lista {
  return {
    ...lista,
    items: (lista.items || []).map((it) =>
      normalizeListaItem(it as Partial<ListaItem> & { id: string; text: string }),
    ),
  };
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
    // Misma Wi‑Fi de casa. La cookie la pone la API al activar (no aquí:
    // en el render de la página Next no deja escribir cookies → 500).
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
    // Cookie: solo desde Route Handler (Set-Cookie). No en Server Component.
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
  return normalizeLista(data.lists[id] ?? emptyLista(id));
}

/** Vista segura para el cliente: sin URL privada del Blob. */
export function listaPublicView(lista: Lista) {
  const normalized = normalizeLista(lista);
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
      done: it.done,
      hasPhoto: Boolean(it.photoUrl),
      photoSrc: it.photoUrl ? `/api/lista/${normalized.id}/photo/${it.id}` : undefined,
    })),
  };
}

export function formatListaQty(qty: number, unit: ListaUnit) {
  if (unit === "g") return `${qty} g`;
  return qty > 1 ? `×${qty}` : "";
}

export async function setListaItemPhoto(
  id: string,
  itemId: string,
  bytes: Buffer,
  contentType: string,
): Promise<Lista> {
  if (!process.env.BLOB_READ_WRITE_TOKEN) {
    throw new Error("Falta Blob en Vercel para guardar fotos");
  }
  if (bytes.length > 1_200_000) throw new Error("Foto demasiado grande");
  const data = await load();
  const lista = data.lists[id] ?? emptyLista(id);
  const item = lista.items.find((it) => it.id === itemId);
  if (!item) throw new Error("ítem no encontrado");

  const { put, del } = await import("@vercel/blob");
  const pathname = `lista-fotos/${id}/${itemId}.jpg`;
  if (item.photoUrl) {
    try {
      await del(item.photoUrl);
    } catch {
      /* ok */
    }
  }
  const blob = await put(pathname, bytes, {
    access: "private",
    addRandomSuffix: false,
    allowOverwrite: true,
    contentType: contentType.startsWith("image/") ? contentType : "image/jpeg",
    cacheControlMaxAge: 0,
  });
  item.photoUrl = blob.url;
  item.updatedAt = new Date().toISOString();
  lista.updatedAt = item.updatedAt;
  data.lists[id] = lista;
  await persist(data);
  return lista;
}

export async function clearListaItemPhoto(id: string, itemId: string): Promise<Lista> {
  const data = await load();
  const lista = data.lists[id] ?? emptyLista(id);
  const item = lista.items.find((it) => it.id === itemId);
  if (!item) throw new Error("ítem no encontrado");
  if (item.photoUrl && process.env.BLOB_READ_WRITE_TOKEN) {
    try {
      const { del } = await import("@vercel/blob");
      await del(item.photoUrl);
    } catch {
      /* ok */
    }
  }
  delete item.photoUrl;
  item.updatedAt = new Date().toISOString();
  lista.updatedAt = item.updatedAt;
  data.lists[id] = lista;
  await persist(data);
  return lista;
}

export async function readListaItemPhoto(
  id: string,
  itemId: string,
): Promise<{ body: ArrayBuffer; contentType: string } | null> {
  const data = await load();
  const item = data.lists[id]?.items.find((it) => it.id === itemId);
  if (!item?.photoUrl || !process.env.BLOB_READ_WRITE_TOKEN) return null;
  try {
    const { get } = await import("@vercel/blob");
    const result = await get(item.photoUrl, { access: "private" });
    if (!result || result.statusCode !== 200 || !result.stream) return null;
    const res = new Response(result.stream);
    return {
      body: await res.arrayBuffer(),
      contentType: result.blob.contentType || "image/jpeg",
    };
  } catch {
    return null;
  }
}

export async function addListaItem(
  id: string,
  text: string,
  qty = 1,
  opts?: { section?: ListaSection; unit?: ListaUnit },
): Promise<Lista> {
  const t = cleanText(text);
  if (!t) throw new Error("texto vacío");
  const section = normalizeListaSection(opts?.section);
  const unit = normalizeListaUnit(opts?.unit);
  const data = await load();
  const lista = normalizeLista(data.lists[id] ?? emptyLista(id));
  const now = new Date().toISOString();
  const existing = lista.items.find(
    (it) =>
      !it.done &&
      it.section === section &&
      it.unit === unit &&
      it.text.toLocaleLowerCase("es") === t.toLocaleLowerCase("es"),
  );
  if (existing) {
    existing.qty = clampQty(existing.qty + clampQty(qty, unit), unit);
    existing.updatedAt = now;
  } else {
    lista.items.unshift({
      id: `i_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`,
      text: t,
      qty: clampQty(qty, unit),
      unit,
      section,
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
  patch: {
    qty?: number;
    done?: boolean;
    text?: string;
    unit?: ListaUnit;
    section?: ListaSection;
  },
): Promise<Lista> {
  const data = await load();
  const lista = normalizeLista(data.lists[id] ?? emptyLista(id));
  const item = lista.items.find((it) => it.id === itemId);
  if (!item) throw new Error("ítem no encontrado");
  const now = new Date().toISOString();
  if (patch.unit !== undefined) item.unit = normalizeListaUnit(patch.unit);
  if (patch.section !== undefined) item.section = normalizeListaSection(patch.section);
  if (patch.qty !== undefined) item.qty = clampQty(patch.qty, item.unit);
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
  const item = lista.items.find((it) => it.id === itemId);
  if (item?.photoUrl && process.env.BLOB_READ_WRITE_TOKEN) {
    try {
      const { del } = await import("@vercel/blob");
      await del(item.photoUrl);
    } catch {
      /* ok */
    }
  }
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

export function listaItemLine(it: Pick<ListaItem, "text" | "qty" | "unit">) {
  const q = formatListaQty(it.qty, it.unit);
  return q ? `• ${it.text} ${q}` : `• ${it.text}`;
}

export function listaShareText(lista: Lista) {
  const pending = normalizeLista(lista).items.filter((it) => !it.done);
  if (!pending.length) return "Lista vacía.";
  const blocks: string[] = ["Lista de la compra"];
  for (const section of LISTA_SECTIONS) {
    const rows = pending.filter((it) => it.section === section);
    if (!rows.length) continue;
    blocks.push("", listaSectionLabel(section));
    blocks.push(...rows.map(listaItemLine));
  }
  return blocks.join("\n");
}
