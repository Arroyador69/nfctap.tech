"use client";

import { CardPreview } from "@/components/CardPreview";
import { ACCENT_HEX, BODY_COLORS, PRICES, TEMPLATES, defaultDesign, productLabel } from "@/lib/catalog";
import { euros, shippingCost, zoneFromPostalCode, ZONE_LABEL } from "@/lib/shipping";
import type { CardDesign, ProductKind, Qty, ShippingSettings, ShippingZone } from "@/lib/types";
import { useMemo, useState, type ReactNode } from "react";

type Props = {
  initialKind?: ProductKind;
  shipping: ShippingSettings;
};

export function Designer({ initialKind = "personalizada", shipping }: Props) {
  const [kind, setKind] = useState<ProductKind>(initialKind);
  const [qty, setQty] = useState<Qty>(1);
  const [design, setDesign] = useState<CardDesign>(defaultDesign(initialKind));
  const [preview, setPreview] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
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
  const ship = shippingCost(zone, productPrice, shipping);
  const total = productPrice + ship;
  const patch = (p: Partial<CardDesign>) => setDesign((d) => ({ ...d, ...p }));

  const onLogo = (file: File | undefined) => {
    if (!file) return patch({ logoDataUrl: undefined });
    const reader = new FileReader();
    reader.onload = () => patch({ logoDataUrl: String(reader.result) });
    reader.readAsDataURL(file);
  };

  const canPay = useMemo(
    () => form.name && form.email && form.line1 && form.city && form.postalCode.length >= 4,
    [form],
  );

  async function submit() {
    setError("");
    setBusy(true);
    try {
      const res = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          kind,
          qty,
          design,
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
    <div className="grid items-start gap-8 xl:grid-cols-[1.15fr_0.85fr]">
      <CardPreview
        design={design}
        onReady={(url) => setPreview((prev) => (prev === url ? prev : url))}
      />

      <div className="space-y-6 rounded-[28px] border border-[#e6ddd0] bg-white p-5 shadow-[0_16px_40px_rgba(40,28,10,0.05)] sm:p-7">
        <div>
          <p className="text-xs uppercase tracking-[0.18em] text-[#b0892c]">Editor</p>
          <h2 className="mt-1 font-[family-name:var(--font-display)] text-3xl text-[#1c1915]">
            Crea tu propia tarjeta
          </h2>
          <p className="mt-2 text-sm text-[#6f675c]">
            El cliente toca y deja la reseña en Google. Tú solo imprimes lo que ves.
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
              }}
              className={`rounded-2xl px-3 py-3 text-sm font-medium ${
                kind === k ? "bg-[#1c1915] text-[#f6f1e7]" : "bg-[#f3eee4] text-[#5c564c]"
              }`}
            >
              {k === "personalizada" ? "Personalizada" : "Genérica NFCTab"}
            </button>
          ))}
        </div>

        <div className="grid grid-cols-2 gap-2">
          {([1, 2] as Qty[]).map((q) => (
            <button
              key={q}
              type="button"
              onClick={() => setQty(q)}
              className={`rounded-2xl border px-3 py-3 text-left ${
                qty === q ? "border-[#1c1915] bg-[#faf6ee]" : "border-[#e6ddd0]"
              }`}
            >
              <div className="text-sm">{productLabel(kind, q)}</div>
              <div className="text-lg font-semibold">{euros(PRICES[kind][q])}</div>
            </button>
          ))}
        </div>

        {kind === "personalizada" && (
          <>
            <div className="grid gap-2">
              {TEMPLATES.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => patch({ template: t.id })}
                  className={`rounded-2xl border px-3 py-2 text-left ${
                    design.template === t.id ? "border-[#c4a056] bg-[#fff8ea]" : "border-[#e6ddd0]"
                  }`}
                >
                  <div className="text-sm font-medium">{t.name}</div>
                  <div className="text-xs text-[#7a7266]">{t.blurb}</div>
                </button>
              ))}
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Nombre del negocio">
                <input
                  value={design.line1}
                  maxLength={22}
                  onChange={(e) => patch({ line1: e.target.value })}
                />
              </Field>
              <Field label="Texto inferior">
                <input
                  value={design.line2}
                  maxLength={32}
                  onChange={(e) => patch({ line2: e.target.value })}
                />
              </Field>
            </div>

            <Field label="Enlace de reseña Google">
              <input
                placeholder="https://g.page/r/…/review"
                value={design.googleUrl}
                onChange={(e) => patch({ googleUrl: e.target.value })}
              />
            </Field>

            <div>
              <p className="mb-2 text-xs uppercase tracking-wider text-[#8a8173]">Color de la pieza</p>
              <div className="flex gap-2">
                {BODY_COLORS.map((c) => (
                  <button
                    key={c.id}
                    type="button"
                    title={c.label}
                    onClick={() => patch({ bodyColor: c.id })}
                    className={`h-10 w-10 rounded-full border-2 ${
                      design.bodyColor === c.id ? "border-[#1c1915]" : "border-[#e6ddd0]"
                    }`}
                    style={{ background: c.hex }}
                  />
                ))}
              </div>
            </div>

            <div>
              <p className="mb-2 text-xs uppercase tracking-wider text-[#8a8173]">Estrellas</p>
              <div className="flex gap-2">
                {(["oro", "blanco", "rojo"] as const).map((id) => (
                  <button
                    key={id}
                    type="button"
                    onClick={() => patch({ accentColor: id })}
                    className={`h-10 w-10 rounded-full border-2 ${
                      design.accentColor === id ? "border-[#1c1915]" : "border-[#e6ddd0]"
                    }`}
                    style={{ background: ACCENT_HEX[id] }}
                  />
                ))}
              </div>
            </div>

            <Field label="Logo (se verá en blanco y negro)">
              <input
                type="file"
                accept="image/*"
                className="mt-1 w-full text-sm file:mr-3 file:rounded-full file:border-0 file:bg-[#1c1915] file:px-3 file:py-1.5 file:text-[#f6f1e7]"
                onChange={(e) => onLogo(e.target.files?.[0])}
              />
            </Field>
          </>
        )}

        <hr className="border-[#eee6da]" />
        <p className="text-sm font-medium">Dirección y pago</p>
        <div className="grid gap-3 sm:grid-cols-2">
          {(
            [
              ["name", "Nombre"],
              ["email", "Email"],
              ["phone", "Teléfono"],
              ["line1", "Dirección"],
              ["city", "Ciudad"],
              ["postalCode", "Código postal"],
              ["province", "Provincia"],
            ] as const
          ).map(([key, label]) => (
            <Field key={key} label={label} className={key === "line1" ? "sm:col-span-2" : ""}>
              <input
                value={form[key]}
                onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value }))}
              />
            </Field>
          ))}
        </div>

        <div className="rounded-2xl bg-[#faf6ee] p-4 text-sm">
          <Row k="Zona" v={ZONE_LABEL[zone]} />
          <Row k="Tarjetas" v={euros(productPrice)} />
          <Row k="Envío Correos" v={ship === 0 ? "Gratis" : euros(ship)} />
          <div className="mt-3 flex justify-between text-lg font-semibold">
            <span>Total</span>
            <span>{euros(total)}</span>
          </div>
        </div>

        {error && <p className="text-sm text-red-700">{error}</p>}

        <button
          type="button"
          disabled={!canPay || busy}
          onClick={submit}
          className="w-full rounded-full bg-[#1c1915] py-3.5 font-semibold text-[#f6f1e7] disabled:opacity-40"
        >
          {busy ? "Creando pedido…" : `Encargar y pagar · ${euros(total)}`}
        </button>
      </div>
    </div>
  );
}

function Field({
  label,
  children,
  className = "",
}: {
  label: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <label className={`block text-sm text-[#3f3a34] ${className}`}>
      {label}
      <div className="mt-1 [&_input]:w-full [&_input]:rounded-xl [&_input]:border [&_input]:border-[#e6ddd0] [&_input]:bg-[#fffcf7] [&_input]:px-3 [&_input]:py-2">
        {children}
      </div>
    </label>
  );
}

function Row({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex justify-between text-[#6f675c]">
      <span>{k}</span>
      <span>{v}</span>
    </div>
  );
}
