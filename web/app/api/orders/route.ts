import { isAdmin } from "@/lib/auth";
import { PRICES } from "@/lib/catalog";
import { newId } from "@/lib/ids";
import { isEmail, isPhone, isPostalCode, isReviewUrl } from "@/lib/logo";
import { createPolarCheckout, polarReady } from "@/lib/polar";
import { shippingCost, zoneFromPostalCode } from "@/lib/shipping";
import { addOrder, getShipping, listOrders } from "@/lib/store";
import type { Address, CardDesign, Handover, ProductKind, Qty } from "@/lib/types";
import { NextResponse } from "next/server";

export async function GET() {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }
  return NextResponse.json({ orders: await listOrders() });
}

export async function POST(req: Request) {
  const body = await req.json();
  const admin = await isAdmin();
  const fromAdmin = admin && body.source === "admin";
  const handover: Handover = fromAdmin && body.handover === "mano" ? "mano" : "envio";
  const kind = (body.kind === "generica" ? "generica" : "personalizada") as ProductKind;
  const qty = (Number(body.qty) === 2 ? 2 : 1) as Qty;
  const design = body.design as CardDesign;
  const address = (body.address || {}) as Address;

  if (!isReviewUrl(design?.googleUrl || "")) {
    return NextResponse.json({ error: "Falta el enlace de reseña de Google" }, { status: 400 });
  }
  if (kind === "personalizada" && !design?.line1?.trim()) {
    return NextResponse.json({ error: "Falta el nombre del negocio" }, { status: 400 });
  }

  let normalized: Address;
  if (handover === "mano") {
    if (!address.name?.trim()) {
      return NextResponse.json({ error: "Pon el nombre del cliente" }, { status: 400 });
    }
    normalized = {
      name: address.name.trim(),
      email: address.email?.trim() || "mano@nfctap.tech",
      phone: address.phone?.trim() || "",
      line1: "Entrega en mano",
      line2: address.line2?.trim(),
      city: address.city?.trim() || "En mano",
      postalCode: address.postalCode?.trim() || "00000",
      province: address.province || "—",
      zone: "peninsula",
    };
  } else {
    if (
      !address.name?.trim() ||
      !isEmail(address.email || "") ||
      !isPhone(address.phone || "") ||
      !address.line1?.trim() ||
      !address.city?.trim() ||
      !isPostalCode(address.postalCode || "") ||
      !address.province
    ) {
      return NextResponse.json({ error: "Faltan datos de envío" }, { status: 400 });
    }
    normalized = {
      ...address,
      name: address.name.trim(),
      email: address.email.trim(),
      phone: address.phone.trim(),
      line1: address.line1.trim(),
      line2: address.line2?.trim(),
      city: address.city.trim(),
      postalCode: address.postalCode.trim(),
      zone: zoneFromPostalCode(address.postalCode),
    };
  }

  const logo =
    kind === "personalizada" &&
    typeof design?.logoDataUrl === "string" &&
    design.logoDataUrl.startsWith("data:image/") &&
    design.logoDataUrl.length < 450_000
      ? design.logoDataUrl
      : undefined;

  const logoMask =
    kind === "personalizada" &&
    typeof design?.logoMask === "string" &&
    /^[01]{64,2500}$/.test(design.logoMask)
      ? design.logoMask
      : undefined;

  const preview =
    typeof body.previewDataUrl === "string" &&
    body.previewDataUrl.startsWith("data:image/") &&
    body.previewDataUrl.length < 900_000
      ? body.previewDataUrl
      : undefined;

  const settings = await getShipping();
  const productPrice = PRICES[kind][qty];
  const shippingPrice = handover === "mano" ? 0 : shippingCost(normalized.zone, productPrice, settings);
  const id = newId();

  const order = await addOrder({
    id,
    createdAt: new Date().toISOString(),
    kind,
    qty,
    design: {
      kind,
      template: "clasica",
      bodyColor: design?.bodyColor ?? "negro",
      accentColor: design?.accentColor ?? "oro",
      line1: kind === "generica" ? "" : design.line1.trim().slice(0, 24),
      line2:
        kind === "generica"
          ? "Toca para dejar tu reseña"
          : (design.line2 || "Toca para dejar tu reseña").trim().slice(0, 40),
      logoDataUrl: logo,
      logoMask,
      googleUrl: design.googleUrl.trim(),
    },
    address: normalized,
    productPrice,
    shippingPrice,
    total: productPrice + shippingPrice,
    status: fromAdmin || !polarReady() ? "pagado" : "pendiente_pago",
    source: fromAdmin ? "admin" : "web",
    handover,
    previewDataUrl: preview,
    notes: fromAdmin ? "Creado desde el admin." : polarReady() ? "" : "Pago Polar pendiente de conectar.",
  });

  if (fromAdmin) {
    return NextResponse.json({
      order: { id: order.id, kind: order.kind, qty: order.qty, total: order.total, status: order.status },
      checkoutUrl: `/dashboard/pedidos/${id}`,
      polar: false,
    });
  }

  const origin = new URL(req.url).origin;
  let checkoutUrl: string | null = null;
  try {
    checkoutUrl = await createPolarCheckout({
      kind,
      qty,
      orderId: id,
      email: normalized.email,
      successUrl: `${origin}/pedido/ok?id=${id}&checkout_id={CHECKOUT_ID}`,
    });
  } catch {
    checkoutUrl = null;
  }

  return NextResponse.json({
    order: { id: order.id, kind: order.kind, qty: order.qty, total: order.total, status: order.status },
    checkoutUrl: checkoutUrl || `/pedido/ok?id=${id}`,
    polar: polarReady(),
  });
}
