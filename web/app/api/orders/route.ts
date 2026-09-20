import { isAdmin } from "@/lib/auth";
import {
  clampQty,
  goodsPrice,
  isCatalogModel,
  isFaceModel,
  MAX_QTY,
  needsLogo,
  parseKind,
} from "@/lib/catalog";
import { cartGoodsPrice, isCartLine, polarFromCart } from "@/lib/cart";
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
import type { Address, AccentColor, BodyColor, CardDesign, FaceModel, Handover, OrderLine, OrderPiece, ProductKind, WifiAddon } from "@/lib/types";
import { wifiConfigOk, wifiLandingUrl } from "@/lib/wifi-tap";
import { NextResponse } from "next/server";

export async function GET() {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }
  return NextResponse.json({ orders: await listOrders() });
}

function parsePieces(kind: CardDesign["kind"], design: CardDesign, qty: number): OrderPiece[] | { error: string } {
  if (kind === "wifi") {
    const ssid = (design?.wifiSsid || "").trim();
    const open = Boolean(design?.wifiOpen);
    const password = open ? "" : (design?.wifiPassword || "").trim();
    if (!wifiConfigOk(ssid, password, open)) {
      return {
        error: !ssid
          ? "Falta el nombre de la red Wi‑Fi"
          : "La contraseña Wi‑Fi tiene que tener al menos 8 caracteres, o marca red abierta",
      };
    }
    const url = wifiLandingUrl(ssid, password, open);
    const piece: OrderPiece = { model: "wifi", nfcUrl: url };
    return Array.from({ length: clampQty(qty) }, () => ({ ...piece }));
  }
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

const BODY_OK: BodyColor[] = ["negro", "blanco", "rojo"];
const ACCENT_OK: AccentColor[] = ["oro", "amarillo", "blanco", "rojo", "negro"];

function parseWifiAddon(kind: CardDesign["kind"], raw: unknown): WifiAddon | undefined | { error: string } {
  if (kind === "wifi" || raw == null) return undefined;
  if (typeof raw !== "object") return { error: "TAP Wi‑Fi no válido" };
  const v = raw as Record<string, unknown>;
  const qty = clampQty(v.qty);
  const ssid = typeof v.ssid === "string" ? v.ssid.trim() : "";
  const open = Boolean(v.open);
  const password = open ? "" : typeof v.password === "string" ? v.password.trim() : "";
  if (!wifiConfigOk(ssid, password, open)) {
    return {
      error: !ssid
        ? "El TAP Wi‑Fi necesita el nombre de la red"
        : "La contraseña Wi‑Fi del TAP de pared no es válida",
    };
  }
  const bodyColor = BODY_OK.includes(v.bodyColor as BodyColor) ? (v.bodyColor as BodyColor) : "negro";
  const accentColor = ACCENT_OK.includes(v.accentColor as AccentColor)
    ? (v.accentColor as AccentColor)
    : "blanco";
  return { qty, ssid, password, open, bodyColor, accentColor };
}

function parseCartItems(raw: unknown):
  | {
      kind: ProductKind;
      qty: number;
      pieces: OrderPiece[];
      design: CardDesign;
      wifiAddon?: WifiAddon;
      lines: OrderLine[];
      productEuros: number;
    }
  | { error: string }
  | null {
  if (!Array.isArray(raw) || raw.length === 0) return null;
  const lines: OrderLine[] = [];
  let used = 0;
  for (const item of raw) {
    if (!isCartLine(item)) return { error: "Hay un producto del carrito que no es válido" };
    if (item.kind === "unica") return { error: "La pieza única se encarga por email" };
    const qty = clampQty(item.qty);
    if (used + qty > MAX_QTY) return { error: `Tope ${MAX_QTY} piezas por pedido` };
    used += qty;
    if (item.kind === "wifi") {
      const ssid = (item.wifiSsid || "").trim();
      const open = Boolean(item.wifiOpen);
      const password = open ? "" : (item.wifiPassword || "").trim();
      if (!wifiConfigOk(ssid, password, open)) {
        return { error: "El TAP Wi‑Fi necesita la red y una contraseña de al menos 8 caracteres" };
      }
      lines.push({
        ...item,
        qty,
        nfcUrl: wifiLandingUrl(ssid, password, open),
        wifiSsid: ssid,
        wifiPassword: password,
        wifiOpen: open,
      });
      continue;
    }
    if (item.kind === "personalizada") {
      if (!isHttpUrl(item.nfcUrl || "")) return { error: "Falta el enlace de la pieza con logo" };
      if (!(typeof item.logoDataUrl === "string" && item.logoDataUrl.startsWith("data:image/"))) {
        return { error: "Falta el logo" };
      }
      lines.push({ ...item, qty, nfcUrl: item.nfcUrl.trim() });
      continue;
    }
    if (!isCatalogModel(item.model) || !nfcUrlOk(item.model, item.nfcUrl || "")) {
      return { error: "Falta el enlace de Google, WhatsApp o Instagram" };
    }
    lines.push({
      ...item,
      qty,
      nfcUrl: normalizeNfcUrl(item.model, item.nfcUrl),
    });
  }
  if (!lines.length) return { error: "El carrito está vacío" };

  const pieces: OrderPiece[] = [];
  let wifiAddon: WifiAddon | undefined;
  for (const l of lines) {
    if (l.kind === "wifi") {
      wifiAddon = {
        qty: (wifiAddon?.qty || 0) + l.qty,
        bodyColor: l.bodyColor,
        accentColor: l.accentColor,
        ssid: l.wifiSsid || "",
        password: l.wifiPassword || "",
        open: Boolean(l.wifiOpen),
      };
      continue;
    }
    for (let i = 0; i < l.qty && pieces.length < MAX_QTY; i++) {
      pieces.push({ model: l.model, nfcUrl: l.nfcUrl });
    }
  }
  const first = lines[0];
  const custom = lines.find((l) => l.kind === "personalizada");
  const polar = polarFromCart(lines);
  const wifiOnly = lines.every((l) => l.kind === "wifi");
  const design: CardDesign = {
    kind: polar.kind,
    model: wifiOnly ? "wifi" : pieces[0]?.model || first.model,
    template: "clasica",
    bodyColor: (custom || first).bodyColor,
    accentColor: (custom || first).accentColor,
    line1: (custom?.line1 || "").slice(0, 22),
    line2: "",
    logoDataUrl: custom?.logoDataUrl,
    logoMask: custom?.logoMask,
    googleUrl: pieces[0]?.nfcUrl || first.nfcUrl,
    extraUrl: pieces[1]?.nfcUrl,
    pieces: pieces.length ? pieces : undefined,
    wifiSsid: wifiAddon?.ssid,
    wifiPassword: wifiAddon?.password,
    wifiOpen: wifiAddon?.open,
  };
  return {
    kind: polar.kind,
    qty: wifiOnly ? wifiAddon?.qty || first.qty : Math.max(1, pieces.length),
    pieces: wifiOnly
      ? Array.from({ length: wifiAddon?.qty || 1 }, () => ({
          model: "wifi" as const,
          nfcUrl: first.nfcUrl,
        }))
      : pieces,
    design,
    wifiAddon: wifiOnly ? undefined : wifiAddon,
    lines,
    productEuros: cartGoodsPrice(lines),
  };
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
  const cart = parseCartItems(body.items);
  if (cart && "error" in cart) {
    return NextResponse.json({ error: cart.error }, { status: 400 });
  }
  const kind = cart ? cart.kind : parseKind(body.kind, fromAdmin);
  const design = cart ? cart.design : (body.design as CardDesign);
  const parsed = cart ? cart.pieces : parsePieces(kind, design, clampQty(body.qty));
  if (!cart && parsed && "error" in parsed) {
    return NextResponse.json({ error: parsed.error }, { status: 400 });
  }
  const pieces = cart ? cart.pieces : (parsed as OrderPiece[]);
  const qty = cart ? cart.qty : kind === "unica" ? 1 : pieces.length;
  if (kind !== "unica" && qty < 1) {
    return NextResponse.json({ error: "Elige al menos una pieza" }, { status: 400 });
  }
  const addonOrErr = cart ? cart.wifiAddon : parseWifiAddon(kind, body.wifiAddon);
  if (addonOrErr && "error" in addonOrErr) {
    return NextResponse.json({ error: addonOrErr.error }, { status: 400 });
  }
  const wifiAddon = cart ? cart.wifiAddon : addonOrErr;
  const address = (body.address || {}) as Address;

  if (
    !cart &&
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
    typeof design?.logoDataUrl === "string" &&
    design.logoDataUrl.startsWith("data:image/") &&
    design.logoDataUrl.length < 1_200_000
      ? design.logoDataUrl
      : undefined;

  const logoMask =
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
  const productEuros = cart ? cart.productEuros : goodsPrice(kind, qty, wifiAddon?.qty || 0);
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
      accentColor: design?.accentColor ?? (kind === "wifi" ? "blanco" : "amarillo"),
      line1: kind === "generica" || kind === "wifi" ? "" : (design.line1 || "").trim().slice(0, 22),
      line2: "",
      logoDataUrl: logo,
      logoMask,
      googleUrl: pieces[0].nfcUrl,
      extraUrl: pieces[1]?.nfcUrl,
      pieces,
      wifiSsid: kind === "wifi" ? (design.wifiSsid || "").trim() : undefined,
      wifiPassword: kind === "wifi" ? (design.wifiOpen ? "" : design.wifiPassword || "") : undefined,
      wifiOpen: kind === "wifi" ? Boolean(design.wifiOpen) : undefined,
    },
    address: normalized,
    productPrice: productEuros,
    shippingPrice,
    total: productEuros + shippingPrice,
    status: fromAdmin || !polarReady() ? "pagado" : "pendiente_pago",
    source: fromAdmin ? "admin" : "web",
    handover,
    previewDataUrl: preview,
    wifiAddon,
    lines: cart?.lines,
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
      returnUrl: `${origin}/carrito`,
      productEuros,
      shippingEuros: shippingPrice,
      totalEuros: order.total,
      customerIp: customerIp(req),
      city: normalized.city,
      postalCode: normalized.postalCode,
      line1: normalized.line1,
      zone: normalized.zone,
      models: pieces.map((p) => p.model).join(","),
      wifiQty: wifiAddon?.qty || (kind === "wifi" ? qty : 0),
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
