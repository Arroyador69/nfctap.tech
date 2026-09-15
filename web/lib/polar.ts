import { productPrice } from "./catalog";
import type { ProductKind, ShippingZone } from "./types";

const PRODUCT_ENV = [
  "POLAR_PRODUCT_GENERIC_1",
  "POLAR_PRODUCT_GENERIC_2",
  "POLAR_PRODUCT_CUSTOM_1",
  "POLAR_PRODUCT_CUSTOM_2",
] as const;

export function polarHasToken() {
  return Boolean(process.env.POLAR_ACCESS_TOKEN);
}

export function polarReady() {
  return Boolean(polarHasToken() && PRODUCT_ENV.every((k) => process.env[k]));
}

export function polarMissing() {
  const missing: string[] = [];
  if (!process.env.POLAR_ACCESS_TOKEN) missing.push("POLAR_ACCESS_TOKEN");
  for (const k of PRODUCT_ENV) {
    if (!process.env[k]) missing.push(k);
  }
  if (!process.env.POLAR_WEBHOOK_SECRET) missing.push("POLAR_WEBHOOK_SECRET");
  return missing;
}

export function polarProductSlot(kind: ProductKind, qty: number) {
  const slot = qty >= 2 ? 2 : 1;
  const k = kind === "generica" ? "GENERIC" : kind === "unica" ? "UNICA" : "CUSTOM";
  return `POLAR_PRODUCT_${k}_${slot}`;
}

export function productEnvKey(kind: ProductKind, qty: number) {
  return polarProductSlot(kind, qty);
}

function polarBase() {
  return process.env.POLAR_SERVER === "sandbox"
    ? "https://sandbox-api.polar.sh/v1"
    : "https://api.polar.sh/v1";
}

function polarHeaders() {
  return {
    Authorization: `Bearer ${process.env.POLAR_ACCESS_TOKEN}`,
    "Content-Type": "application/json",
    "Polar-Version": "2026-10",
  };
}

/** IP real del comprador (Vercel / proxy). Polar la usa para mostrar Bizum en España. */
export function customerIp(req: Request): string | undefined {
  const h = req.headers;
  const ip =
    h.get("cf-connecting-ip")?.trim() ||
    h.get("x-real-ip")?.trim() ||
    h.get("x-forwarded-for")?.split(",")[0]?.trim();
  if (!ip || ip === "127.0.0.1" || ip === "::1" || ip === "0.0.0.0") return undefined;
  return ip;
}

export async function createPolarCheckout(input: {
  kind: ProductKind;
  qty: number;
  orderId: string;
  email: string;
  name: string;
  successUrl: string;
  returnUrl?: string;
  productEuros: number;
  shippingEuros: number;
  totalEuros: number;
  customerIp?: string;
  city?: string;
  postalCode?: string;
  line1?: string;
  zone?: ShippingZone;
  models?: string;
}) {
  if (!polarReady()) return null;

  const productId = process.env[productEnvKey(input.kind, input.qty)];
  if (!productId) {
    console.error(`Polar: falta ${productEnvKey(input.kind, input.qty)}`);
    return null;
  }

  const amount = Math.round(input.totalEuros * 100);
  const body: Record<string, unknown> = {
    products: [productId],
    prices: {
      [productId]: [
        {
          amount_type: "fixed",
          price_amount: amount,
          price_currency: "eur",
          tax_behavior: "inclusive",
        },
      ],
    },
    success_url: input.successUrl,
    customer_email: input.email,
    customer_name: input.name,
    locale: "es",
    allow_discount_codes: false,
    customer_billing_address: {
      country: "ES",
      city: input.city || undefined,
      postal_code: input.postalCode || undefined,
      line1: input.line1 || undefined,
    },
    metadata: {
      orderId: input.orderId,
      kind: input.kind,
      qty: String(input.qty),
      product: String(input.productEuros),
      shipping: String(input.shippingEuros),
      total: String(input.totalEuros),
      zone: input.zone || "",
      catalog: String(productPrice(input.kind, input.qty)),
      models: input.models || input.kind,
    },
  };
  if (input.returnUrl) body.return_url = input.returnUrl;
  if (input.customerIp) body.customer_ip_address = input.customerIp;

  const res = await fetch(`${polarBase()}/checkouts/`, {
    method: "POST",
    headers: polarHeaders(),
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const err = await res.text();
    console.error("Polar checkout", res.status, err.slice(0, 800));
    return null;
  }

  const checkout = (await res.json()) as { url?: string };
  return checkout.url ? withCheckoutQuery(checkout.url) : null;
}

function withCheckoutQuery(url: string) {
  const u = new URL(url);
  u.searchParams.set("theme", "light");
  u.searchParams.set("locale", "es");
  return u.toString();
}
