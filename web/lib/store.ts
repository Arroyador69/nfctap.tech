import { existsSync, mkdirSync, readFileSync, writeFileSync } from "fs";
import { tmpdir } from "os";
import path from "path";
import { DEFAULT_SHIPPING } from "./shipping";
import type { Order, ShippingSettings, StoreData } from "./types";

const BLOB_KEY = "nfctab-store.json";

function emptyStore(): StoreData {
  return { orders: [], shipping: { ...DEFAULT_SHIPPING } };
}

function filePath() {
  if (process.env.VERCEL) return path.join(tmpdir(), "nfctab-store.json");
  return path.join(process.cwd(), "data", "store.json");
}

export function blobConfigured() {
  return Boolean(process.env.BLOB_READ_WRITE_TOKEN);
}

async function readBlob(): Promise<StoreData | null> {
  if (!blobConfigured()) return null;
  try {
    const { list } = await import("@vercel/blob");
    const { blobs } = await list({ prefix: BLOB_KEY, limit: 5 });
    const hit = blobs.find((b) => b.pathname === BLOB_KEY || b.pathname.endsWith(BLOB_KEY));
    if (!hit) return null;
    const res = await fetch(hit.url);
    if (!res.ok) return null;
    return (await res.json()) as StoreData;
  } catch {
    return null;
  }
}

async function writeBlob(data: StoreData) {
  const { put } = await import("@vercel/blob");
  await put(BLOB_KEY, JSON.stringify(data), {
    access: "private",
    addRandomSuffix: false,
    allowOverwrite: true,
  });
}

function readDisk(): StoreData | null {
  try {
    const p = filePath();
    if (!existsSync(p)) return null;
    return JSON.parse(readFileSync(p, "utf8")) as StoreData;
  } catch {
    return null;
  }
}

function writeDisk(data: StoreData) {
  try {
    const p = filePath();
    mkdirSync(path.dirname(p), { recursive: true });
    writeFileSync(p, JSON.stringify(data, null, 2));
  } catch {
    /* Vercel /tmp o disco local */
  }
}

async function load(): Promise<StoreData> {
  if (blobConfigured()) {
    return (await readBlob()) ?? emptyStore();
  }
  if (!globalThis.__nfctab_store) {
    globalThis.__nfctab_store = readDisk() ?? emptyStore();
  }
  return globalThis.__nfctab_store;
}

async function persist(data: StoreData) {
  globalThis.__nfctab_store = data;
  if (blobConfigured()) {
    await writeBlob(data);
    return;
  }
  writeDisk(data);
}

declare global {
  var __nfctab_store: StoreData | undefined;
}

export async function listOrders() {
  return [...(await load()).orders].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export async function getOrder(id: string) {
  return (await load()).orders.find((o) => o.id === id) ?? null;
}

export async function addOrder(order: Order) {
  const data = await load();
  data.orders.unshift(order);
  await persist(data);
  return order;
}

export async function updateOrder(id: string, patch: Partial<Order>) {
  const data = await load();
  const i = data.orders.findIndex((o) => o.id === id);
  if (i < 0) return null;
  data.orders[i] = { ...data.orders[i], ...patch };
  await persist(data);
  return data.orders[i];
}

export async function getShipping() {
  return { ...(await load()).shipping };
}

export async function setShipping(shipping: ShippingSettings) {
  const data = await load();
  data.shipping = shipping;
  await persist(data);
  return data.shipping;
}
