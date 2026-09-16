import { isAdmin } from "@/lib/auth";
import {
  clampQty,
  isCatalogModel,
  isFaceModel,
  MAX_QTY,
  needsLogo,
  parseKind,
  productPrice as catalogPrice,
} from "@/lib/catalog";
import { newId } from "@/lib/ids";
import {
  isEmail,
  isHttpUrl,
  isPhone,
  isPostalCode,
  nfcUrlOk,
  normalizeNfcUrl,
} from "@/lib/logo";
import { cleanMetaCookie, cleanMetaIp } from "@/lib/meta-capi";
import { createPolarCheckout, customerIp, polarReady } from "@/lib/polar";
import { shippingCost, zoneFromPostalCode } from "@/lib/shipping";
import { addOrder, getShipping, listOrders } from "@/lib/store";
import type { Address, CardDesign, FaceModel, Handover, OrderPiece } from "@/lib/types";
import { NextResponse } from "next/server";

export async function GET() {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }
  return NextResponse.json({ orders: await listOrders() });
}

function parsePieces(kind: CardDesign["kind"], design: CardDesign, qty: number): OrderPiece[] | { error: string } {
  const raw = Array.isArray(design?.pieces) ? design.pieces : [];
  if (kind === "unica") {
    if (!nfcUrlOk("google", design?.googleUrl || "") && !isHttpUrl(design?.googleUrl || "")) {
      return { error: "Falta el enlace del primer NFC" };
    }
    const extra = typeof design?.extraUrl === "string" ? design.extraUrl.trim() : "";
    if (!isHttpUrl(extra)) return { error: "Falta el segundo NFC (carta, Instagram o menú)" };
    return [
      { model: "personalizada", nfcUrl: design.googleUrl.trim() },
      { model: "personalizada", nfcUrl: extra },
    ];
  }
  if (kind === "personalizada") {
    const url = (design?.googleUrl || raw[0]?.nfcUrl || "").trim();
    if (!isHttpUrl(url)) return { error: "Falta el enlace que abrirá el móvil" };
    const piece: OrderPiece = { model: "personalizada", nfcUrl: url };
    return Array.from({ length: clampQty(qty) }, () => ({ ...piece }));
  }
  const listed = raw
    .map((p) => ({
      model: p.model as FaceModel,
      nfcUrl: typeof p.nfcUrl === "string" ? p.nfcUrl.trim() : "",
    }))
    .filter((p) => isCatalogModel(p.model))
    .slice(0, MAX_QTY);
  const pieces: OrderPiece[] = listed.length
    ? listed
    : [
        {
          model:
            isFaceModel(design?.model) && design.model !== "personalizada" ? design.model : "google",
          nfcUrl: (design?.googleUrl || "").trim(),
        },
      ];
  if (!pieces.length) return { error: "Elige Google, WhatsApp o Instagram" };
  for (const p of pieces) {
    if (!nfcUrlOk(p.model, p.nfcUrl)) {
      return {
        error:
          p.model === "whatsapp"
            ? "Falta el número o el enlace de WhatsApp"
            : p.model === "instagram"
              ? "Falta el enlace o @cuenta de Instagram"
              : "Falta el enlace de reseña de Google",
      };
    }
    p.nfcUrl = normalizeNfcUrl(p.model, p.nfcUrl);
  }
  return pieces;
}

export async function POST(req: Request) {
  const body = await req.json();
  const admin = await isAdmin();
  const fromAdmin = admin && body.source === "admin";
  const handover: Handover = fromAdmin && body.handover === "mano" ? "mano" : "envio";
  if (!fromAdmin && body.kind === "unica") {
    return NextResponse.json(
      { error: "La pieza única se encarga por email, no desde la web." },
      { status: 400 },
    );
  }
  const kind = parseKind(body.kind, fromAdmin);
  const design = body.design as CardDesign;
  const parsed = parsePieces(kind, design, clampQty(body.qty));
  if ("error" in parsed) {
    return NextResponse.json({ error: parsed.error }, { status: 400 });
  }
  const pieces = parsed;
  const qty = kind === "unica" ? 1 : pieces.length;
  if (kind !== "unica" && qty < 1) {
    return NextResponse.json({ error: "Elige al menos una pieza" }, { status: 400 });
  }
  const address = (body.address || {}) as Address;

  if (
    needsLogo(kind) &&
    !(typeof design?.logoDataUrl === "string" && design.logoDataUrl.startsWith("data:image/"))
  ) {
    return NextResponse.json({ error: "Falta el logo" }, { status: 400 });
  }

  let normalized: Address;
  if (handover === "mano") {
    if (!address.name?.trim()) {
      return NextResponse.json({ error: "Pon el nombre del cliente" }, { status: 400 });
    }
    normalized = {
      name: address.name.trim(),
      email: address.email?.trim() || "contacto@nfctap.tech",
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
    needsLogo(kind) &&
    typeof design?.logoDataUrl === "string" &&
    design.logoDataUrl.startsWith("data:image/") &&
    design.logoDataUrl.length < 1_200_000
      ? design.logoDataUrl
      : undefined;

  const logoMask =
    needsLogo(kind) &&
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
  const productEuros = catalogPrice(kind, qty);
  const shippingPrice = handover === "mano" ? 0 : shippingCost(normalized.zone, settings, productEuros);
  const id = newId();

  const order = await addOrder({
    id,
    createdAt: new Date().toISOString(),
    kind,
    qty,
    design: {
      kind,
      model: pieces[0].model,
      template: "clasica",
      bodyColor: design?.bodyColor ?? "negro",
      accentColor: design?.accentColor ?? "amarillo",
      line1: kind === "generica" ? "" : (design.line1 || "").trim().slice(0, 22),
      line2: "",
      logoDataUrl: logo,
      logoMask,
      googleUrl: pieces[0].nfcUrl,
      extraUrl: pieces[1]?.nfcUrl,
      pieces,
    },
    address: normalized,
    productPrice: productEuros,
    shippingPrice,
    total: productEuros + shippingPrice,
    status: fromAdmin || !polarReady() ? "pagado" : "pendiente_pago",
    source: fromAdmin ? "admin" : "web",
    handover,
    previewDataUrl: preview,
    notes: fromAdmin ? "Creado desde el admin." : polarReady() ? "" : "Pago Polar pendiente de conectar.",
    metaFbp: fromAdmin ? undefined : cleanMetaCookie(body.fbp, "fbp"),
    metaFbc: fromAdmin ? undefined : cleanMetaCookie(body.fbc, "fbc"),
    metaIp: fromAdmin ? undefined : cleanMetaIp(customerIp(req)),
  });

  if (fromAdmin) {
    return NextResponse.json({
      order: { id: order.id, kind: order.kind, qty: order.qty, total: order.total, status: order.status },
      checkoutUrl: `/dashboard/pedidos/${id}`,
      polar: false,
    });
  }

  const origin = new URL(req.url).origin;
  const firstModel = pieces[0].model === "personalizada" ? "personalizada" : pieces[0].model;
  let checkoutUrl: string | null = null;
  try {
    checkoutUrl = await createPolarCheckout({
      kind,
      qty,
      orderId: id,
      email: normalized.email,
      name: normalized.name,
      successUrl: `${origin}/pedido/ok?id=${id}&checkout_id={CHECKOUT_ID}`,
      returnUrl: `${origin}/personalizar?models=${pieces.map((p) => p.model).join(",")}`,
      productEuros,
      shippingEuros: shippingPrice,
      totalEuros: order.total,
      customerIp: customerIp(req),
      city: normalized.city,
      postalCode: normalized.postalCode,
      line1: normalized.line1,
      zone: normalized.zone,
      models: pieces.map((p) => p.model).join(","),
    });
  } catch {
    checkoutUrl = null;
  }

  if (polarReady() && !checkoutUrl) {
    return NextResponse.json(
      { error: "No se pudo abrir el pago. Prueba de nuevo en un momento." },
      { status: 502 },
    );
  }

  return NextResponse.json({
    order: { id: order.id, kind: order.kind, qty: order.qty, total: order.total, status: order.status },
    checkoutUrl: checkoutUrl || `/pedido/ok?id=${id}`,
    polar: polarReady(),
    model: firstModel,
  });
}
