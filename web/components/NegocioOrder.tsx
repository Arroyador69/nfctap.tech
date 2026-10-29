"use client";

import { unicaPrice } from "@/lib/catalog";
import { isEmail, isHttpUrl, isPhone, isPostalCode } from "@/lib/logo";
import { metaClickIds } from "@/lib/meta-pixel";
import { PROVINCIAS } from "@/lib/provinces";
import { euros, shippingCost, ZONE_LABEL, zoneFromPostalCode } from "@/lib/shipping";
import type { AccentColor, BodyColor, ShippingZone } from "@/lib/types";
import { useMemo, useState } from "react";

type Role = "google" | "instagram" | "whatsapp" | "otro";

const ROLE_LABEL: Record<Role, string> = {
  google: "Google reseñas",
  instagram: "Instagram",
  whatsapp: "WhatsApp",
  otro: "Otro enlace",
};

export function NegocioOrder({
  bodyColor = "negro",
  accentColor = "blanco",
  logoDataUrl = "",
  line1 = "",
  onLine1,
}: {
  bodyColor?: BodyColor;
  accentColor?: AccentColor;
  logoDataUrl?: string;
  line1?: string;
  onLine1?: (v: string) => void;
}) {
  const [chips, setChips] = useState<1 | 2 | 3>(2);
  const [roles, setRoles] = useState<Role[]>(["google", "instagram", "otro"]);
  const [urls, setUrls] = useState(["", "", ""]);
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
  const productEuros = unicaPrice(chips);
  const ship = shippingCost(zone, undefined, productEuros);
  const total = productEuros + ship;

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
    if (!logoDataUrl) {
      setError("Sube el logo arriba, en el círculo de la pieza 3D.");
      return;
    }
    for (let i = 0; i < chips; i++) {
      if (!isHttpUrl(urls[i])) {
        setError(`Falta el enlace del chip ${i + 1} (${ROLE_LABEL[roles[i]]}).`);
        return;
      }
    }
    if (!shipOk) {
      setError("Completa la dirección de envío en España.");
      return;
    }
    setBusy(true);
    try {
      const res = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          kind: "unica",
          qty: 1,
          ...metaClickIds(),
          design: {
            kind: "unica",
            model: "personalizada",
            template: "clasica",
            bodyColor,
            accentColor,
            line1: line1.trim().slice(0, 22),
            line2: "",
            logoDataUrl,
            googleUrl: urls[0].trim(),
            extraUrl: chips >= 2 ? urls[1].trim() : "",
            thirdUrl: chips >= 3 ? urls[2].trim() : "",
            chipCount: chips,
            chipRoles: roles.slice(0, chips),
          },
          address: { ...form, zone },
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "No se pudo crear el pedido.");
        setBusy(false);
        return;
      }
      if (data.checkoutUrl) {
        window.location.assign(data.checkoutUrl);
        return;
      }
      setError("Pedido creado, pero no hay enlace de pago. Escríbenos a contacto@nfctap.tech");
    } catch {
      setError("Error de red. Prueba de nuevo.");
    }
    setBusy(false);
  }

  return (
    <section className="mx-auto max-w-6xl px-5 pb-24">
      <div className="rounded-[28px] border border-[#e6ddd0] bg-white p-6 sm:p-8">
        <h2 className="text-2xl font-semibold">Encargar el tuyo</h2>
        <p className="mt-2 text-sm text-[#6f675c]">
          El logo ya está en el 3D. Elige chips, pega enlaces y paga. Base {euros(unicaPrice(2))}{" "}
          con 2 chips · +{euros(15)} el tercero · 1 chip {euros(unicaPrice(1))}.
        </p>

        <label className="mt-6 block text-sm font-medium">
          Nº de chips NFC
          <div className="mt-2 flex gap-2">
            {([1, 2, 3] as const).map((n) => (
              <button
                key={n}
                type="button"
                onClick={() => setChips(n)}
                className={`rounded-full px-4 py-2 text-sm ${
                  chips === n ? "bg-[#1c1915] text-[#f6f1e7]" : "bg-[#f3eee4] text-[#1c1915]"
                }`}
              >
                {n} · {euros(unicaPrice(n))}
              </button>
            ))}
          </div>
        </label>

        <label className="mt-5 block text-sm font-medium">
          Nombre en la pieza (opcional)
          <input
            value={line1}
            onChange={(e) => onLine1?.(e.target.value)}
            maxLength={22}
            className="mt-2 w-full rounded-xl border border-[#e6ddd0] px-3 py-2"
            placeholder="Tu negocio"
          />
        </label>

        {Array.from({ length: chips }).map((_, i) => (
          <div key={i} className="mt-5 grid gap-2 sm:grid-cols-[140px_1fr]">
            <label className="text-sm font-medium">
              Chip {i + 1}
              <select
                value={roles[i]}
                onChange={(e) => {
                  const next = [...roles] as Role[];
                  next[i] = e.target.value as Role;
                  setRoles(next);
                }}
                className="mt-2 w-full rounded-xl border border-[#e6ddd0] px-3 py-2"
              >
                {(Object.keys(ROLE_LABEL) as Role[]).map((r) => (
                  <option key={r} value={r}>
                    {ROLE_LABEL[r]}
                  </option>
                ))}
              </select>
            </label>
            <label className="text-sm font-medium">
              Enlace
              <input
                value={urls[i]}
                onChange={(e) => {
                  const next = [...urls];
                  next[i] = e.target.value;
                  setUrls(next);
                }}
                className={`mt-2 w-full rounded-xl border px-3 py-2 ${
                  tried && !isHttpUrl(urls[i]) ? "border-red-400" : "border-[#e6ddd0]"
                }`}
                placeholder={
                  roles[i] === "google"
                    ? "https://g.page/r/…/review"
                    : roles[i] === "instagram"
                      ? "https://instagram.com/…"
                      : roles[i] === "whatsapp"
                        ? "https://wa.me/34…"
                        : "https://…"
                }
              />
            </label>
          </div>
        ))}

        <h3 className="mt-8 text-lg font-semibold">Envío</h3>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          {(
            [
              ["name", "Nombre"],
              ["email", "Email"],
              ["phone", "Teléfono"],
              ["line1", "Calle y número"],
              ["line2", "Piso / local (opcional)"],
              ["city", "Ciudad"],
              ["postalCode", "Código postal"],
            ] as const
          ).map(([key, label]) => (
            <label
              key={key}
              className={`text-sm font-medium ${key === "line1" || key === "line2" ? "sm:col-span-2" : ""}`}
            >
              {label}
              <input
                value={form[key]}
                onChange={(e) => setForm({ ...form, [key]: e.target.value })}
                className="mt-1 w-full rounded-xl border border-[#e6ddd0] px-3 py-2"
              />
            </label>
          ))}
          <label className="text-sm font-medium sm:col-span-2">
            Provincia
            <select
              value={form.province}
              onChange={(e) => setForm({ ...form, province: e.target.value })}
              className="mt-1 w-full rounded-xl border border-[#e6ddd0] px-3 py-2"
            >
              <option value="">Elige provincia</option>
              {PROVINCIAS.map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </select>
          </label>
        </div>

        <div className="mt-6 space-y-1 text-sm text-[#5c564c]">
          <p className="flex justify-between">
            <span>
              Producto ({chips} chip{chips > 1 ? "s" : ""})
            </span>
            <span>{euros(productEuros)}</span>
          </p>
          <p className="flex justify-between">
            <span>Envío ({ZONE_LABEL[zone]})</span>
            <span>
              {form.postalCode.length === 5 ? (ship === 0 ? "Gratis" : euros(ship)) : "—"}
            </span>
          </p>
          <p className="flex justify-between text-base font-semibold text-[#1c1915]">
            <span>Total</span>
            <span>{euros(total)}</span>
          </p>
        </div>

        {error ? <p className="mt-4 text-sm text-red-600">{error}</p> : null}

        <button
          type="button"
          disabled={busy}
          onClick={pay}
          className="mt-6 w-full rounded-full bg-[#1c1915] px-5 py-3 text-sm font-semibold text-[#f6f1e7] disabled:opacity-60"
        >
          {busy ? "Abriendo pago…" : `Pagar · ${euros(total)}`}
        </button>
      </div>
    </section>
  );
}
