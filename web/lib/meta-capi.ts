import { createHash } from "crypto";
import { META_PIXEL_ID } from "./meta-pixel";
import type { Order } from "./types";

function sha256(value: string) {
  return createHash("sha256").update(value).digest("hex");
}

function hashEmail(email: string) {
  const v = email.trim().toLowerCase();
  return v.includes("@") ? sha256(v) : undefined;
}

function hashPhoneEs(phone: string) {
  let d = phone.replace(/\D/g, "");
  if (d.length < 9) return undefined;
  if (d.startsWith("00")) d = d.slice(2);
  if (!d.startsWith("34") && d.length === 9) d = `34${d}`;
  return sha256(d);
}

function hashText(value: string) {
  const v = value.trim().toLowerCase();
  return v ? sha256(v) : undefined;
}

export function cleanMetaCookie(value: unknown, kind: "fbp" | "fbc") {
  if (typeof value !== "string") return undefined;
  const v = value.trim().slice(0, 200);
  if (kind === "fbp" && /^fb\.1\.\d+\.\d+$/.test(v)) return v;
  if (kind === "fbc" && /^fb\.1\.\d+\.[A-Za-z0-9._-]+$/.test(v)) return v;
  return undefined;
}

export function cleanMetaIp(value: unknown) {
  if (typeof value !== "string") return undefined;
  const v = value.trim();
  if (!v || v === "127.0.0.1" || v === "::1") return undefined;
  return v.slice(0, 64);
}

/** Compra confirmada por Polar. Mismo event_id que el Pixel en /pedido/ok. */
export async function sendMetaCapiPurchase(order: Order) {
  const token = process.env.META_CAPI_ACCESS_TOKEN?.trim();
  if (!token || !META_PIXEL_ID) return { skipped: true as const };
  if (order.source === "admin") return { skipped: true as const };

  const user_data: Record<string, unknown> = {
    country: [sha256("es")],
  };
  const em = hashEmail(order.address.email);
  if (em) user_data.em = [em];
  const ph = hashPhoneEs(order.address.phone);
  if (ph) user_data.ph = [ph];
  const first = order.address.name.trim().split(/\s+/)[0] || "";
  const fn = hashText(first.replace(/[^a-zñçáéíóúü]/gi, ""));
  if (fn) user_data.fn = [fn];
  const city = hashText(order.address.city);
  if (city) user_data.ct = [city];
  const zip = hashText(order.address.postalCode);
  if (zip) user_data.zp = [zip];
  if (order.metaFbp) user_data.fbp = order.metaFbp;
  if (order.metaFbc) user_data.fbc = order.metaFbc;
  if (order.metaIp) user_data.client_ip_address = order.metaIp;

  const body: Record<string, unknown> = {
    data: [
      {
        event_name: "Purchase",
        event_time: Math.floor(Date.now() / 1000),
        event_id: order.id,
        event_source_url: `https://nfctap.tech/pedido/ok?id=${encodeURIComponent(order.id)}`,
        action_source: "website",
        user_data,
        custom_data: {
          currency: "EUR",
          value: Number(order.total),
          content_type: "product",
          content_name: order.kind,
          content_ids: [order.kind],
          num_items: order.qty,
          order_id: order.id,
        },
      },
    ],
    access_token: token,
  };
  const test = process.env.META_CAPI_TEST_EVENT_CODE?.trim();
  if (test) body.test_event_code = test;

  const res = await fetch(`https://graph.facebook.com/v21.0/${META_PIXEL_ID}/events`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    console.error("Meta CAPI Purchase", res.status, (await res.text()).slice(0, 400));
    return { ok: false as const };
  }
  return { ok: true as const };
}
