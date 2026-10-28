import { madridDate } from "./stats";
import { listOrders } from "@/lib/store";
import { NFC_SALES_DAILY_GOAL } from "./constants";

const PAID = new Set(["pagado", "en_impresion", "enviado", "entregado"]);

/** Pedidos pagados unica/personalizada del día (Madrid). */
export async function salesTodayCount() {
  const day = madridDate();
  const orders = await listOrders();
  return orders.filter((o) => {
    if (!PAID.has(o.status)) return false;
    if (o.kind !== "unica" && o.kind !== "personalizada") return false;
    const created = o.createdAt?.slice(0, 10);
    // createdAt ISO → comparar fecha Madrid vía toLocale
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
