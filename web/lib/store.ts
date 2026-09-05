import { existsSync, mkdirSync, readFileSync, writeFileSync } from "fs";
import { tmpdir } from "os";
import path from "path";
import { DEFAULT_SHIPPING } from "./shipping";
import type { Order, ShippingSettings, StoreData } from "./types";

declare global {
  var __nfctab_store: StoreData | undefined;
}

function emptyStore(): StoreData {
  return { orders: [], shipping: { ...DEFAULT_SHIPPING } };
}

function filePath() {
  if (process.env.VERCEL) return path.join(tmpdir(), "nfctab-store.json");
  return path.join(process.cwd(), "data", "store.json");
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
    /* Vercel read-only except /tmp */
  }
}

function load(): StoreData {
  if (!globalThis.__nfctab_store) {
    globalThis.__nfctab_store = readDisk() ?? emptyStore();
  }
  return globalThis.__nfctab_store;
}

function persist(data: StoreData) {
  globalThis.__nfctab_store = data;
  writeDisk(data);
}

export function listOrders() {
  return [...load().orders].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export function getOrder(id: string) {
  return load().orders.find((o) => o.id === id) ?? null;
}

export function addOrder(order: Order) {
  const data = load();
  data.orders.unshift(order);
  persist(data);
  return order;
}

export function updateOrder(id: string, patch: Partial<Order>) {
  const data = load();
  const i = data.orders.findIndex((o) => o.id === id);
  if (i < 0) return null;
  data.orders[i] = { ...data.orders[i], ...patch };
  persist(data);
  return data.orders[i];
}

export function getShipping() {
  return { ...load().shipping };
}

export function setShipping(shipping: ShippingSettings) {
  const data = load();
  data.shipping = shipping;
  persist(data);
  return data.shipping;
}
