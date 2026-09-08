import { createHmac, timingSafeEqual } from "crypto";

function signaturesOf(header: string) {
  return header
    .split(/[\s,]+/)
    .map((part) => part.replace(/^v1,/, "").trim())
    .filter(Boolean);
}

function matches(digestB64: string, given: string) {
  const a = Buffer.from(digestB64);
  const b = Buffer.from(given);
  return a.length === b.length && timingSafeEqual(a, b);
}

function hmacB64(key: Buffer, payload: string) {
  return createHmac("sha256", key).update(payload).digest("base64");
}

/** Polar Standard Webhooks (secretos nuevos) y Polar HMAC (secretos anteriores). */
export function verifyPolarWebhook(raw: string, headers: Headers, secret: string) {
  const id = headers.get("webhook-id") || headers.get("svix-id");
  const ts = headers.get("webhook-timestamp") || headers.get("svix-timestamp");
  const sig = headers.get("webhook-signature") || headers.get("svix-signature");
  if (!id || !ts || !sig || !secret) return false;

  const payload = `${id}.${ts}.${raw}`;
  const given = signaturesOf(sig);
  const keys: Buffer[] = [];
  if (secret.startsWith("whsec_")) {
    keys.push(Buffer.from(secret.slice(6), "base64"));
    keys.push(Buffer.from(secret, "utf8"));
  } else {
    keys.push(Buffer.from(secret, "utf8"));
  }

  for (const key of keys) {
    const digest = hmacB64(key, payload);
    if (given.some((g) => matches(digest, g))) return true;
  }
  return false;
}

export function polarMarksPaid(type: string, status?: string) {
  if (type === "order.created" || type === "order.paid" || type === "order.updated") return true;
  if (type === "checkout.confirmed") return true;
  return type === "checkout.updated" && (status === "succeeded" || status === "confirmed");
}
