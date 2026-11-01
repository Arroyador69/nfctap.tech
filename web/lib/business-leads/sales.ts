import { listOrders } from "@/lib/store";
import { NFC_SALES_DAILY_GOAL } from "./constants";
import { madridDate } from "./stats";

const PAID = new Set(["pagado", "en_impresion", "enviado", "entregado"]);

/** Pedidos pagados `/negocio` (unica) del día (Madrid) — KPI oleadas. */
export async function salesTodayCount() {
  const day = madridDate();
  const orders = await listOrders();
  return orders.filter((o) => {
    if (!PAID.has(o.status)) return false;
    if (o.kind !== "unica") return false;
    const created = o.createdAt?.slice(0, 10);
    const madrid = new Intl.DateTimeFormat("en-CA", {
      timeZone: "Europe/Madrid",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(new Date(o.createdAt));
    return madrid === day || created === day;
  }).length;
}

export async function salesGoalReached() {
  const n = await salesTodayCount();
  return { count: n, goal: NFC_SALES_DAILY_GOAL, stop: n >= NFC_SALES_DAILY_GOAL };
}

/** Emails que ya compraron unica (cualquier día) — no follow-up. */
export async function paidUnicaEmailSet(): Promise<Set<string>> {
  const orders = await listOrders();
  const set = new Set<string>();
  for (const o of orders) {
    if (!PAID.has(o.status)) continue;
    if (o.kind !== "unica") continue;
    const email = o.address?.email?.toLowerCase().trim();
    if (email?.includes("@")) set.add(email);
  }
  return set;
}

