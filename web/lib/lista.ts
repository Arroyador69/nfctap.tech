import { existsSync, mkdirSync, readFileSync, writeFileSync } from "fs";
import { tmpdir } from "os";
import path from "path";

const BLOB_KEY = "nfctab-listas.json";
const ID_RE = /^[a-z0-9-]{3,32}$/;

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

type ListaStore = { lists: Record<string, Lista> };

function emptyStore(): ListaStore {
  return { lists: {} };
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

async function readBlob(): Promise<ListaStore | null> {
  if (!process.env.BLOB_READ_WRITE_TOKEN) return null;
  try {
    const { list } = await import("@vercel/blob");
    const { blobs } = await list({ prefix: BLOB_KEY, limit: 5 });
    const hit = blobs.find((b) => b.pathname === BLOB_KEY || b.pathname.endsWith(BLOB_KEY));
    if (!hit) return null;
    const res = await fetch(hit.url);
    if (!res.ok) return null;
    return (await res.json()) as ListaStore;
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
  });
}

function readDisk(): ListaStore | null {
  try {
    const p = filePath();
    if (!existsSync(p)) return null;
    return JSON.parse(readFileSync(p, "utf8")) as ListaStore;
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
    return (await readBlob()) ?? emptyStore();
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
