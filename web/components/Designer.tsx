"use client";

import { CardPreview } from "@/components/CardPreview";
import { ACCENT_COLORS, ACCENT_HEX, BODY_COLORS, PRICES, defaultDesign, productLabel } from "@/lib/catalog";
import { isEmail, isPhone, isPostalCode, isReviewUrl, prepareLogo } from "@/lib/logo";
import { PROVINCIAS } from "@/lib/provinces";
import { euros, shippingCost, zoneFromPostalCode, ZONE_LABEL } from "@/lib/shipping";
import type { CardDesign, Handover, ProductKind, Qty, ShippingSettings, ShippingZone } from "@/lib/types";
import { useMemo, useState, type ReactNode } from "react";

type Props = {
  initialKind?: ProductKind;
  shipping: ShippingSettings;
  mode?: "public" | "admin";
};

type Step = "diseno" | "envio";

export function Designer({ initialKind = "personalizada", shipping, mode = "public" }: Props) {
  const admin = mode === "admin";
  const [step, setStep] = useState<Step>("diseno");
  const [handover, setHandover] = useState<Handover>("envio");
  const [kind, setKind] = useState<ProductKind>(initialKind);
  const [qty, setQty] = useState<Qty>(1);
  const [design, setDesign] = useState<CardDesign>(defaultDesign(initialKind));
  const [preview, setPreview] = useState("");
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
  const productPrice = PRICES[kind][qty];
  const ship = handover === "mano" ? 0 : shippingCost(zone, productPrice, shipping);
  const total = productPrice + ship;
  const patch = (p: Partial<CardDesign>) => setDesign((d) => ({ ...d, ...p }));

  async function onLogo(file: File | undefined) {
    if (!file) return patch({ logoDataUrl: undefined });
    try {
      const { dataUrl, mask } = await prepareLogo(file);
      patch({ logoDataUrl: dataUrl, logoMask: mask });
    } catch {
      setError("No se pudo leer el logo. Prueba otra imagen.");
    }
  }

  const designOk = useMemo(() => {
    if (!isReviewUrl(design.googleUrl)) return false;
    if (kind === "personalizada" && !design.logoDataUrl) return false;
    return true;
  }, [design.googleUrl, design.logoDataUrl, kind]);

  const shipOk = useMemo(() => {
    if (admin && handover === "mano") return Boolean(form.name.trim());
    return Boolean(
      form.name.trim() &&
        isEmail(form.email) &&
        isPhone(form.phone) &&
        form.line1.trim() &&
        form.city.trim() &&
        isPostalCode(form.postalCode) &&
        form.province,
    );
  }, [admin, form, handover]);

  function goShip() {
    setTried(true);
    setError("");
    if (!designOk) {
      setError(
        kind === "personalizada"
          ? "Sube el logo y pega el enlace de reseña de Google."
          : "Falta el enlace de reseña de Google (el de Pedir reseñas).",
      );
      return;
    }
    setTried(false);
    setStep("envio");
  }

  async function submit() {
    setTried(true);
    setError("");
    if (!shipOk) {
      setError(
        admin && handover === "mano"
          ? "Pon al menos el nombre del cliente."
          : "Completa la dirección: nombre, email, teléfono, calle, CP, ciudad y provincia.",
      );
      return;
    }
    setBusy(true);
    try {
      const res = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          kind,
          qty,
          source: admin ? "admin" : "web",
          handover: admin ? handover : "envio",
          design: {
            ...design,
            kind,
            logoDataUrl: kind === "generica" ? undefined : design.logoDataUrl,
          },
          previewDataUrl: preview,
          address: { ...form, zone },
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "No se pudo crear el pedido");
      window.location.assign(data.checkoutUrl || `/pedido/ok?id=${data.order.id}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error");
      setBusy(false);
    }
  }

  return (
    <div className="pb-28 lg:pb-0">
      <div className="grid items-start gap-5 lg:grid-cols-[1.05fr_0.95fr] lg:gap-8">
        <div className="sticky top-14 z-20 -mx-5 bg-[#f6f1e8]/92 px-5 py-2 backdrop-blur-md lg:static lg:top-auto lg:mx-0 lg:bg-transparent lg:p-0 lg:backdrop-blur-none">
          <CardPreview
            design={{ ...design, kind }}
            compact
            onReady={(url) => setPreview((prev) => (prev === url ? prev : url))}
          />
        </div>

        <div className="space-y-5 rounded-[24px] border border-[#e6ddd0] bg-white p-4 shadow-[0_16px_40px_rgba(40,28,10,0.05)] sm:p-6">
          <div className="flex gap-2 text-xs">
            <span className={step === "diseno" ? "font-semibold text-[#1c1915]" : "text-[#8a8173]"}>1. Diseño</span>
            <span className="text-[#cfc4b2]">→</span>
            <span className={step === "envio" ? "font-semibold text-[#1c1915]" : "text-[#8a8173]"}>
              2. {admin ? "Cliente" : "Envío"}
            </span>
          </div>

          {step === "diseno" ? (
            <>
              <div>
                <h2 className="font-[family-name:var(--font-display)] text-2xl text-[#1c1915] sm:text-3xl">
                  Crea la tarjeta
                </h2>
                <p className="mt-1 text-sm text-[#6f675c]">
                  Un modelo. Lo editas aquí y se encarga. No se descarga.
                </p>
              </div>

              <div className="grid grid-cols-2 gap-2">
                {(["personalizada", "generica"] as ProductKind[]).map((k) => (
                  <button
                    key={k}
                    type="button"
                    onClick={() => {
                      setKind(k);
                      setDesign(defaultDesign(k));
                      setTried(false);
                    }}
                    className={`min-h-12 rounded-2xl px-3 py-3 text-sm font-medium ${
                      kind === k ? "bg-[#1c1915] text-[#f6f1e7]" : "bg-[#f3eee4] text-[#5c564c]"
                    }`}
                  >
                    {k === "personalizada" ? "Personalizada" : "Genérica"}
                  </button>
                ))}
              </div>

              <div className="grid grid-cols-2 gap-2">
                {([1, 2] as Qty[]).map((q) => (
                  <button
                    key={q}
                    type="button"
                    onClick={() => setQty(q)}
                    className={`min-h-14 rounded-2xl border px-3 py-3 text-left ${
                      qty === q ? "border-[#1c1915] bg-[#faf6ee]" : "border-[#e6ddd0]"
                    }`}
                  >
                    <div className="text-sm">{productLabel(kind, q)}</div>
                    <div className="text-lg font-semibold">{euros(PRICES[kind][q])}</div>
                  </button>
                ))}
              </div>

              {kind === "personalizada" ? (
                <>
                  <div>
                    <p className="mb-2 text-sm text-[#3f3a34]">
                      Logo {tried && !design.logoDataUrl ? <span className="text-red-700">· obligatorio</span> : null}
                    </p>
                    <label className="flex min-h-14 cursor-pointer items-center justify-center rounded-2xl border border-dashed border-[#cfc4b2] bg-[#fffcf7] px-3 text-sm">
                      {design.logoDataUrl ? "Cambiar logo" : "Subir logo"}
                      <input
                        type="file"
                        accept="image/png,image/jpeg,image/webp,image/svg+xml"
                        className="sr-only"
                        onChange={(e) => onLogo(e.target.files?.[0])}
                      />
                    </label>
                    <p className="mt-2 text-xs text-[#8a8173]">
                      PNG con fondo transparente si puedes. Cuadrado o redondo, unos 800×800 px. Se
                      imprime en el color de acento, en el mismo sitio y tamaño que la G (~33 mm).
                      El hueco NFC va abajo: no lleva tinta encima.
                    </p>
                    {design.logoDataUrl && (
                      <button
                        type="button"
                        className="mt-2 text-xs text-[#7a7266] underline"
                        onClick={() => patch({ logoDataUrl: undefined, logoMask: undefined })}
                      >
                        Quitar logo
                      </button>
                    )}
                  </div>
                  <Field label="Nombre del negocio (opcional)">
                    <input
                      value={design.line1}
                      maxLength={22}
                      autoComplete="organization"
                      placeholder="Entre TAP y RESEÑA"
                      onChange={(e) => patch({ line1: e.target.value })}
                    />
                  </Field>
                </>
              ) : (
                <p className="rounded-2xl bg-[#faf6ee] px-4 py-3 text-sm text-[#5c564c]">
                  Genérica: G de Google, TAP / RESEÑA, pie NFCTap y hueco NFC abierto. Elige cuerpo, acento y el enlace.
                </p>
              )}

              <Field
                label="Enlace de reseña Google"
                hint={tried && !isReviewUrl(design.googleUrl) ? "Pega el enlace de Pedir reseñas" : ""}
              >
                <input
                  inputMode="url"
                  autoCapitalize="none"
                  autoCorrect="off"
                  placeholder="https://g.page/r/…/review"
                  value={design.googleUrl}
                  onChange={(e) => patch({ googleUrl: e.target.value })}
                />
              </Field>
              <p className="text-xs text-[#8a8173]">
                Google Business → Pedir reseñas → copiar. Con eso programamos el NFC.
              </p>

              <div>
                <p className="mb-2 text-sm text-[#3f3a34]">Color de la pieza</p>
                <div className="flex gap-3">
                  {BODY_COLORS.map((c) => (
                    <button
                      key={c.id}
                      type="button"
                      title={c.label}
                      onClick={() => patch({ bodyColor: c.id })}
                      className={`h-12 w-12 rounded-full border-2 ${
                        design.bodyColor === c.id ? "border-[#1c1915]" : "border-[#e6ddd0]"
                      }`}
                      style={{ background: c.hex }}
                    />
                  ))}
                </div>
              </div>

              <div>
                <p className="mb-2 text-sm text-[#3f3a34]">
                  {kind === "generica" ? "G, estrellas y TAP" : "Logo, estrellas y TAP"}
                </p>
                <div className="flex gap-3">
                  {ACCENT_COLORS.map((c) => (
                    <button
                      key={c.id}
                      type="button"
                      title={c.label}
                      onClick={() => patch({ accentColor: c.id })}
                      className={`h-12 w-12 rounded-full border-2 ${
                        design.accentColor === c.id ? "border-[#1c1915]" : "border-[#e6ddd0]"
                      }`}
                      style={{ background: ACCENT_HEX[c.id] }}
                    />
                  ))}
                </div>
              </div>

              {error && <p className="text-sm text-red-700">{error}</p>}

              <button
                type="button"
                onClick={goShip}
                className="hidden min-h-12 w-full rounded-full bg-[#1c1915] py-3.5 font-semibold text-[#f6f1e7] lg:block"
              >
                {admin ? "Continuar al cliente" : "Continuar al envío"}
              </button>
            </>
          ) : (
            <>
              <button
                type="button"
                onClick={() => {
                  setStep("diseno");
                  setError("");
                  setTried(false);
                }}
                className="text-sm text-[#7a7266]"
              >
                ← Volver al diseño
              </button>
              <h2 className="font-[family-name:var(--font-display)] text-2xl">
                {admin ? "Datos del cliente" : "Dónde lo enviamos"}
              </h2>
              <p className="text-sm text-[#6f675c]">
                {admin
                  ? "En mano o a Correos. El ZIP (01_cuerpo + 02_acento) es el mismo atril que ves aquí."
                  : "España. El código postal elige la tarifa de Correos. Solo se encarga: no hay descarga."}
              </p>

              {admin && (
                <div className="grid grid-cols-2 gap-2">
                  {(["envio", "mano"] as Handover[]).map((h) => (
                    <button
                      key={h}
                      type="button"
                      onClick={() => setHandover(h)}
                      className={`min-h-12 rounded-2xl px-3 text-sm font-medium ${
                        handover === h ? "bg-[#1c1915] text-[#f6f1e7]" : "bg-[#f3eee4] text-[#5c564c]"
                      }`}
                    >
                      {h === "mano" ? "Entrega en mano" : "Envío Correos"}
                    </button>
                  ))}
                </div>
              )}

              <div className="grid gap-3 sm:grid-cols-2">
                <Field label="Nombre y apellidos" hint={tried && !form.name.trim() ? "Obligatorio" : ""}>
                  <input
                    autoComplete="name"
                    value={form.name}
                    onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                  />
                </Field>
                <Field
                  label={handover === "mano" ? "Email (opcional)" : "Email"}
                  hint={handover === "envio" && tried && !isEmail(form.email) ? "Email no válido" : ""}
                >
                  <input
                    type="email"
                    inputMode="email"
                    autoComplete="email"
                    value={form.email}
                    onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                  />
                </Field>
                <Field
                  label={handover === "mano" ? "Teléfono (opcional)" : "Teléfono"}
                  hint={handover === "envio" && tried && !isPhone(form.phone) ? "Mínimo 9 dígitos" : ""}
                >
                  <input
                    type="tel"
                    inputMode="tel"
                    autoComplete="tel"
                    value={form.phone}
                    onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
                  />
                </Field>
                {handover === "envio" && (
                <>
                <Field label="Dirección" className="sm:col-span-2" hint={tried && !form.line1.trim() ? "Obligatorio" : ""}>
                  <input
                    autoComplete="address-line1"
                    placeholder="Calle y número"
                    value={form.line1}
                    onChange={(e) => setForm((f) => ({ ...f, line1: e.target.value }))}
                  />
                </Field>
                <Field label="Piso, puerta, local" className="sm:col-span-2">
                  <input
                    autoComplete="address-line2"
                    value={form.line2}
                    onChange={(e) => setForm((f) => ({ ...f, line2: e.target.value }))}
                  />
                </Field>
                <Field label="Código postal" hint={tried && !isPostalCode(form.postalCode) ? "5 dígitos" : ""}>
                  <input
                    inputMode="numeric"
                    autoComplete="postal-code"
                    maxLength={5}
                    value={form.postalCode}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, postalCode: e.target.value.replace(/\D/g, "").slice(0, 5) }))
                    }
                  />
                </Field>
                <Field label="Ciudad" hint={tried && !form.city.trim() ? "Obligatorio" : ""}>
                  <input
                    autoComplete="address-level2"
                    value={form.city}
                    onChange={(e) => setForm((f) => ({ ...f, city: e.target.value }))}
                  />
                </Field>
                <Field label="Provincia" className="sm:col-span-2" hint={tried && !form.province ? "Elige provincia" : ""}>
                  <select
                    autoComplete="address-level1"
                    className="w-full rounded-xl border border-[#e6ddd0] bg-[#fffcf7] px-3 py-3 text-base"
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
                </Field>
                </>
                )}
              </div>

              {handover === "envio" && (
                <>
                  <p className="text-xs text-[#8a8173]">Envío a España · Correos</p>
                  <Rates shipping={shipping} zone={form.postalCode.length === 5 ? zone : null} />
                </>
              )}

              <div className="rounded-2xl bg-[#faf6ee] p-4 text-sm">
                <Row k="Producto" v={`${productLabel(kind, qty)} · ${euros(productPrice)}`} />
                <Row k="Zona" v={form.postalCode.length === 5 ? ZONE_LABEL[zone] : "Pon el CP"} />
                <Row k="Envío" v={form.postalCode.length === 5 ? (ship === 0 ? "Gratis" : euros(ship)) : "—"} />
                <div className="mt-3 flex justify-between text-lg font-semibold">
                  <span>Total</span>
                  <span>{euros(total)}</span>
                </div>
              </div>

              {error && <p className="text-sm text-red-700">{error}</p>}

              <button
                type="button"
                disabled={busy}
                onClick={submit}
                className="hidden min-h-12 w-full rounded-full bg-[#1c1915] py-3.5 font-semibold text-[#f6f1e7] disabled:opacity-40 lg:block"
              >
                {busy ? "Guardando…" : admin ? `Guardar pedido · ${euros(total)}` : `Encargar · ${euros(total)}`}
              </button>
            </>
          )}
        </div>
      </div>

      <div className="fixed inset-x-0 bottom-0 z-30 border-t border-[#e6ddd0] bg-[#f6f1e8]/95 px-4 py-3 backdrop-blur-md lg:hidden" style={{ paddingBottom: "max(12px, env(safe-area-inset-bottom))" }}>
        <div className="mx-auto flex max-w-6xl items-center gap-3">
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm text-[#6f675c]">{productLabel(kind, qty)}</p>
            <p className="font-semibold">{euros(total)}</p>
          </div>
          {step === "diseno" ? (
            <button
              type="button"
              onClick={goShip}
              className="min-h-12 shrink-0 rounded-full bg-[#1c1915] px-5 font-semibold text-[#f6f1e7]"
            >
              {admin ? "Cliente" : "Envío"}
            </button>
          ) : (
            <button
              type="button"
              disabled={busy}
              onClick={submit}
              className="min-h-12 shrink-0 rounded-full bg-[#1c1915] px-5 font-semibold text-[#f6f1e7] disabled:opacity-40"
            >
              {busy ? "…" : admin ? "Guardar" : "Encargar"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function Rates({
  shipping,
  zone,
}: {
  shipping: ShippingSettings;
  zone: ShippingZone | null;
}) {
  const rows: { id: ShippingZone; label: string; price: number }[] = [
    { id: "peninsula", label: ZONE_LABEL.peninsula, price: shipping.peninsula },
    { id: "baleares", label: ZONE_LABEL.baleares, price: shipping.baleares },
    { id: "canarias", label: ZONE_LABEL.canarias, price: shipping.canarias },
    { id: "ceuta_melilla", label: ZONE_LABEL.ceuta_melilla, price: shipping.ceuta_melilla },
  ];
  return (
    <ul className="grid gap-2 text-sm">
      {rows.map((r) => (
        <li
          key={r.id}
          className={`flex justify-between rounded-xl px-3 py-2 ${
            zone === r.id ? "bg-[#1c1915] text-[#f6f1e7]" : "bg-[#f3eee4] text-[#5c564c]"
          }`}
        >
          <span>{r.label}</span>
          <span>{euros(r.price)}</span>
        </li>
      ))}
      <li className="px-1 text-xs text-[#8a8173]">
        Península gratis desde {euros(shipping.freePeninsulaFrom)} (pack 2 personalizadas).
      </li>
    </ul>
  );
}

function Field({
  label,
  children,
  className = "",
  hint = "",
}: {
  label: string;
  children: ReactNode;
  className?: string;
  hint?: string;
}) {
  return (
    <label className={`block text-sm text-[#3f3a34] ${className}`}>
      {label}
      <div className="mt-1 [&_input]:min-h-12 [&_input]:w-full [&_input]:rounded-xl [&_input]:border [&_input]:border-[#e6ddd0] [&_input]:bg-[#fffcf7] [&_input]:px-3 [&_input]:py-3 [&_input]:text-base">
        {children}
      </div>
      {hint ? <p className="mt-1 text-xs text-red-700">{hint}</p> : null}
    </label>
  );
}

function Row({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex justify-between gap-3 text-[#6f675c]">
      <span>{k}</span>
      <span className="text-right">{v}</span>
    </div>
  );
}
