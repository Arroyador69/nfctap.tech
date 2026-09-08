import { PRICES } from "./catalog";
import type { ProductKind, Qty } from "./types";

export function polarReady() {
  return Boolean(process.env.POLAR_ACCESS_TOKEN);
}

export function productEnvKey(kind: ProductKind, qty: Qty) {
  const k = kind === "generica" ? "GENERIC" : kind === "unica" ? "UNICA" : "CUSTOM";
  return `POLAR_PRODUCT_${k}_${qty}`;
}

export async function createPolarCheckout(input: {
  kind: ProductKind;
  qty: Qty;
  orderId: string;
  email: string;
  successUrl: string;
}) {
  if (!polarReady()) return null;

  const productId = process.env[productEnvKey(input.kind, input.qty)];
  const res = await fetch(
    process.env.POLAR_SERVER === "production"
      ? "https://api.polar.sh/v1/checkouts/"
      : "https://sandbox-api.polar.sh/v1/checkouts/",
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.POLAR_ACCESS_TOKEN}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        products: productId ? [productId] : undefined,
        success_url: input.successUrl,
        customer_email: input.email,
        metadata: {
          orderId: input.orderId,
          kind: input.kind,
          qty: String(input.qty),
          amount: String(PRICES[input.kind][input.qty]),
        },
      }),
    },
  );
  if (!res.ok) return null;
  const checkout = (await res.json()) as { url?: string };
  return checkout.url ?? null;
}
