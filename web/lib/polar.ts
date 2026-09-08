import { PRICES } from "./catalog";
import type { ProductKind, Qty } from "./types";

export function polarReady() {
  return Boolean(process.env.POLAR_ACCESS_TOKEN);
}

export function productEnvKey(kind: ProductKind, qty: Qty) {
  const k = kind === "generica" ? "GENERIC" : kind === "unica" ? "UNICA" : "CUSTOM";
  return `POLAR_PRODUCT_${k}_${qty}`;
}

function polarBase() {
  return process.env.POLAR_SERVER === "sandbox"
    ? "https://sandbox-api.polar.sh/v1"
    : "https://api.polar.sh/v1";
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
  qty: Qty;
  orderId: string;
  email: string;
  name: string;
  successUrl: string;
  totalEuros: number;
  customerIp?: string;
  city?: string;
  postalCode?: string;
  line1?: string;
}) {
  if (!polarReady()) return null;

  const productId = process.env[productEnvKey(input.kind, input.qty)];
  if (!productId) return null;

  const amount = Math.round(input.totalEuros * 100);
  const body: Record<string, unknown> = {
    products: [productId],
    prices: {
      [productId]: [
        {
          amount_type: "fixed",
          price_amount: amount,
          price_currency: "eur",
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
      amount: String(PRICES[input.kind][input.qty]),
      total: String(input.totalEuros),
    },
  };
  if (input.customerIp) body.customer_ip_address = input.customerIp;

  const res = await fetch(`${polarBase()}/checkouts/`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.POLAR_ACCESS_TOKEN}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const catalog = await fetch(`${polarBase()}/checkouts/`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.POLAR_ACCESS_TOKEN}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        products: [productId],
        success_url: input.successUrl,
        customer_email: input.email,
        customer_name: input.name,
        locale: "es",
        allow_discount_codes: false,
        customer_billing_address: { country: "ES" },
        customer_ip_address: input.customerIp,
        metadata: body.metadata,
      }),
    });
    if (!catalog.ok) return null;
    const checkout = (await catalog.json()) as { url?: string };
    return checkout.url ? withCheckoutQuery(checkout.url) : null;
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
