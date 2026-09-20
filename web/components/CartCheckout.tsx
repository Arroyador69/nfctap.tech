"use client";

import {
  cartCount,
  cartGoodsPrice,
  clearCart,
  emptyCart,
  lineLabel,
  loadCart,
  removeCartLine,
  setCartLineQty,
  subscribeCart,
  toOrderLines,
} from "@/lib/cart";
import { MAX_QTY, MODEL_LABEL } from "@/lib/catalog";
import { isEmail, isPhone, isPostalCode } from "@/lib/logo";
import { metaClickIds, trackMeta } from "@/lib/meta-pixel";
import { PROVINCIAS } from "@/lib/provinces";
import { DEFAULT_SHIPPING, euros, shippingCost, ZONE_LABEL, zoneFromPostalCode } from "@/lib/shipping";
import type { ShippingSettings, ShippingZone } from "@/lib/types";
import Link from "next/link";
import { useMemo, useState, useSyncExternalStore } from "react";

export function CartCheckout({ shipping }: { shipping: ShippingSettings }) {
  const lines = useSyncExternalStore(subscribeCart, loadCart, emptyCart);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [tried, setTried] = useState(false);
  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: "",
    line1: "",
    line2: "",
    city: "",
    postalCode: "",
    province: "",
  });

  const zone: ShippingZone = zoneFromPostalCode(form.postalCode);
  const productEuros = cartGoodsPrice(lines);
  const ship = shippingCost(zone, shipping, productEuros);
  const total = productEuros + ship;
  const n = cartCount(lines);

  const shipOk = useMemo(
    () =>
      Boolean(
        form.name.trim() &&
          isEmail(form.email) &&
          isPhone(form.phone) &&
          form.line1.trim() &&
          form.city.trim() &&
          isPostalCode(form.postalCode) &&
          form.province,
      ),
    [form],
  );

  async function pay() {
    setTried(true);
    setError("");
    if (!lines.length) {
      setError("El carrito está vacío.");
      return;
    }
    if (!shipOk) {
      setError("Dirección en España: nombre, email, teléfono, calle, CP, ciudad y provincia.");
      return;
    }
    setBusy(true);
    try {
      const res = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          items: toOrderLines(lines),
          ...metaClickIds(),
          address: { ...form, zone },
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "No se pudo crear el pedido");
      const orderId = data.order?.id as string | undefined;
      trackMeta(
        "InitiateCheckout",
        {
          value: total,
          currency: "EUR",
          content_name: "carrito",
          content_type: "product",
          num_items: n,
          order_id: orderId,
        },
        orderId,
      );
      await new Promise((r) => setTimeout(r, 400));
      window.location.assign(data.checkoutUrl || `/pedido/ok?id=${data.order.id}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error");
      setBusy(false);
    }
  }

  if (!lines.length) {
    return (
      <div className="rounded-[24px] border border-[#e6ddd0] bg-white p-8 text-center">
        <p className="text-[#5c564c]">Aún no hay nada en el carrito.</p>
        <Link
          href="/personalizar"
          className="mt-6 inline-block rounded-full bg-[#1c1915] px-5 py-3 font-semibold text-[#f6f1e7]"
        >
          Encargar
        </Link>
      </div>
    );
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
      <section className="space-y-3">
        {lines.map((l) => (
          <article key={l.id} className="rounded-[22px] border border-[#e6ddd0] bg-white p-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="font-semibold">{lineLabel(l)}</p>
                <p className="mt-1 text-xs text-[#8a8173]">
                  {l.kind === "wifi"
                    ? `Red ${l.wifiSsid || "—"} · acerca el móvil y se conecta`
                    : l.nfcUrl}
                </p>
              </div>
              <button type="button" className="text-xs text-[#7a7266] underline" onClick={() => removeCartLine(l.id)}>
                Quitar
              </button>
            </div>
            <div className="mt-3 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  className="grid h-10 w-10 place-items-center rounded-full bg-[#f3eee4]"
                  onClick={() => setCartLineQty(l.id, l.qty - 1)}
                >
                  −
                </button>
                <span className="w-6 text-center font-semibold">{l.qty}</span>
                <button
                  type="button"
                  className="grid h-10 w-10 place-items-center rounded-full bg-[#f3eee4] disabled:opacity-30"
                  disabled={n >= MAX_QTY}
                  onClick={() => setCartLineQty(l.id, l.qty + 1)}
                >
                  +
                </button>
              </div>
              <p className="text-sm text-[#6f675c]">{MODEL_LABEL[l.model]}</p>
            </div>
          </article>
        ))}
        <Link href="/personalizar" className="inline-block text-sm text-[#7a7266] underline">
          Añadir más
        </Link>
        <button type="button" className="block text-xs text-[#8a8173] underline" onClick={() => clearCart()}>
          Vaciar carrito
        </button>
      </section>

      <section className="space-y-4 rounded-[24px] border border-[#e6ddd0] bg-white p-5 sm:p-6">
        <h2 className="font-[family-name:var(--font-display)] text-2xl">Dirección en España</h2>
        <p className="text-sm text-[#6f675c]">
          Correos. El código postal elige la tarifa. Polar cobra producto + envío (tarjeta,
          Apple Pay o Bizum).
        </p>
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="block text-sm">
            Nombre y apellidos
            <input
              className="mt-1 min-h-12 w-full rounded-xl border border-[#e6ddd0] bg-[#fffcf7] px-3"
              autoComplete="name"
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
            />
            {tried && !form.name.trim() ? <span className="text-xs text-red-700">Obligatorio</span> : null}
          </label>
          <label className="block text-sm">
            Email
            <input
              className="mt-1 min-h-12 w-full rounded-xl border border-[#e6ddd0] bg-[#fffcf7] px-3"
              type="email"
              autoComplete="email"
              value={form.email}
              onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
            />
          </label>
          <label className="block text-sm">
            Teléfono
            <input
              className="mt-1 min-h-12 w-full rounded-xl border border-[#e6ddd0] bg-[#fffcf7] px-3"
              type="tel"
              autoComplete="tel"
              value={form.phone}
              onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
            />
          </label>
          <label className="block text-sm sm:col-span-2">
            Calle y número
            <input
              className="mt-1 min-h-12 w-full rounded-xl border border-[#e6ddd0] bg-[#fffcf7] px-3"
              autoComplete="address-line1"
              value={form.line1}
              onChange={(e) => setForm((f) => ({ ...f, line1: e.target.value }))}
            />
          </label>
          <label className="block text-sm sm:col-span-2">
            Piso, puerta, local
            <input
              className="mt-1 min-h-12 w-full rounded-xl border border-[#e6ddd0] bg-[#fffcf7] px-3"
              autoComplete="address-line2"
              value={form.line2}
              onChange={(e) => setForm((f) => ({ ...f, line2: e.target.value }))}
            />
          </label>
          <label className="block text-sm">
            Código postal
            <input
              className="mt-1 min-h-12 w-full rounded-xl border border-[#e6ddd0] bg-[#fffcf7] px-3"
              inputMode="numeric"
              autoComplete="postal-code"
              maxLength={5}
              value={form.postalCode}
              onChange={(e) =>
                setForm((f) => ({ ...f, postalCode: e.target.value.replace(/\D/g, "").slice(0, 5) }))
              }
            />
          </label>
          <label className="block text-sm">
            Ciudad
            <input
              className="mt-1 min-h-12 w-full rounded-xl border border-[#e6ddd0] bg-[#fffcf7] px-3"
              autoComplete="address-level2"
              value={form.city}
              onChange={(e) => setForm((f) => ({ ...f, city: e.target.value }))}
            />
          </label>
          <label className="block text-sm sm:col-span-2">
            Provincia
            <select
              className="mt-1 min-h-12 w-full rounded-xl border border-[#e6ddd0] bg-[#fffcf7] px-3"
              autoComplete="address-level1"
              value={form.province}
              onChange={(e) => setForm((f) => ({ ...f, province: e.target.value }))}
            >
              <option value="">Selecciona</option>
              {PROVINCIAS.map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </select>
          </label>
        </div>
        <p className="text-xs text-[#8a8173]">
          Península gratis desde {euros(shipping.freePeninsulaFrom || DEFAULT_SHIPPING.freePeninsulaFrom)} de
          producto.
        </p>
        <div className="rounded-2xl bg-[#faf6ee] p-4 text-sm">
          <div className="flex justify-between text-[#6f675c]">
            <span>Producto</span>
            <span>{euros(productEuros)}</span>
          </div>
          <div className="mt-1 flex justify-between text-[#6f675c]">
            <span>Envío Correos · {form.postalCode.length === 5 ? ZONE_LABEL[zone] : "pon el CP"}</span>
            <span>{form.postalCode.length === 5 ? (ship === 0 ? "Gratis" : euros(ship)) : "—"}</span>
          </div>
          <div className="mt-3 flex justify-between text-lg font-semibold">
            <span>Total</span>
            <span>{euros(total)}</span>
          </div>
        </div>
        {error ? <p className="text-sm text-red-700">{error}</p> : null}
        <button
          type="button"
          disabled={busy}
          onClick={() => void pay()}
          className="min-h-12 w-full rounded-full bg-[#1c1915] py-3.5 font-semibold text-[#f6f1e7] disabled:opacity-40"
        >
          {busy ? "Abriendo pago…" : `Pagar · ${euros(total)}`}
        </button>
      </section>
    </div>
  );
}
