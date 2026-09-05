import { PRICES } from "@/lib/catalog";
import { newId } from "@/lib/ids";
import { createPolarCheckout, polarReady } from "@/lib/polar";
import { shippingCost, zoneFromPostalCode } from "@/lib/shipping";
import { addOrder, getShipping, listOrders } from "@/lib/store";
import type { Address, CardDesign, ProductKind, Qty } from "@/lib/types";
import { NextResponse } from "next/server";

export async function GET() {
  const { isAdmin } = await import("@/lib/auth");
  if (!(await isAdmin())) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }
  return NextResponse.json({ orders: listOrders().map(publicOrder) });
}

export async function POST(req: Request) {
  const body = await req.json();
  const kind = (body.kind === "generica" ? "generica" : "personalizada") as ProductKind;
  const qty = (Number(body.qty) === 2 ? 2 : 1) as Qty;
  const design = body.design as CardDesign;
  const address = body.address as Address;

  if (!address?.name || !address?.email || !address?.line1 || !address?.city) {
    return NextResponse.json({ error: "Faltan datos de envío" }, { status: 400 });
  }

  const zone = address.zone || zoneFromPostalCode(address.postalCode || "");
  const settings = getShipping();
  const productPrice = PRICES[kind][qty];
  const shippingPrice = shippingCost(zone, productPrice, settings);
  const id = newId();

  const order = addOrder({
    id,
    createdAt: new Date().toISOString(),
    kind,
    qty,
    design: {
      template: design?.template ?? "clasica",
      bodyColor: design?.bodyColor ?? "negro",
      accentColor: design?.accentColor ?? "oro",
      line1: (design?.line1 || "TOCA PARA").slice(0, 24),
      line2: (design?.line2 || "RESEÑA").slice(0, 18),
      logoDataUrl: design?.logoDataUrl,
      googleUrl: design?.googleUrl || "",
    },
    address: { ...address, zone },
    productPrice,
    shippingPrice,
    total: productPrice + shippingPrice,
    status: polarReady() ? "pendiente_pago" : "pagado",
    previewDataUrl: typeof body.previewDataUrl === "string" ? body.previewDataUrl : undefined,
    notes: polarReady() ? "" : "Pago Polar pendiente de conectar. Tratado como cobrado en local.",
  });

  const origin = new URL(req.url).origin;
  let checkoutUrl: string | null = null;
  try {
    checkoutUrl = await createPolarCheckout({
      kind,
      qty,
      orderId: id,
      email: address.email,
      successUrl: `${origin}/pedido/ok?id=${id}&checkout_id={CHECKOUT_ID}`,
    });
  } catch {
    checkoutUrl = null;
  }

  return NextResponse.json({
    order: publicOrder(order),
    checkoutUrl: checkoutUrl || `/pedido/ok?id=${id}`,
    polar: polarReady(),
  });
}

function publicOrder(order: ReturnType<typeof addOrder>) {
  const { previewDataUrl, ...rest } = order;
  return { ...rest, hasPreview: Boolean(previewDataUrl) };
}
