"use client";

import { euros, ZONE_LABEL } from "@/lib/shipping";
import type { ShippingSettings } from "@/lib/types";
import { useState } from "react";

export function ShippingForm({ shipping }: { shipping: ShippingSettings }) {
  const [form, setForm] = useState(shipping);
  const [msg, setMsg] = useState("");

  async function save() {
    const res = await fetch("/api/shipping", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    setMsg(res.ok ? "Tarifas guardadas" : "No se pudieron guardar");
  }

  return (
    <section className="mt-12 rounded-3xl border border-[#e6ddd0] bg-white p-6">
      <h2 className="text-xl font-semibold">Envíos Correos (editables)</h2>
      <p className="mt-2 text-sm text-[#6f675c]">
        Partimos de carta/sobre, no de Paq Estándar (13,65 € en península se come una genérica).
        Cambia los importes cuando quieras.
      </p>
      <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {(
          [
            ["peninsula", ZONE_LABEL.peninsula],
            ["baleares", ZONE_LABEL.baleares],
            ["canarias", ZONE_LABEL.canarias],
            ["ceuta_melilla", ZONE_LABEL.ceuta_melilla],
            ["freePeninsulaFrom", "Península gratis a partir de (€)"],
          ] as const
        ).map(([key, label]) => (
          <label key={key} className="text-sm">
            {label}
            <input
              type="number"
              step="0.1"
              className="mt-1 w-full rounded-xl border border-[#e6ddd0] bg-[#fffcf7] px-3 py-2"
              value={form[key]}
              onChange={(e) => setForm((f) => ({ ...f, [key]: Number(e.target.value) }))}
            />
          </label>
        ))}
      </div>
      <button
        onClick={save}
        className="mt-5 rounded-full bg-[#1c1915] px-5 py-2 text-sm font-medium text-[#f6f1e7]"
      >
        Guardar tarifas
      </button>
      {msg && <span className="ml-3 text-sm text-[#6f675c]">{msg}</span>}
      <p className="mt-4 text-xs text-[#8a8173]">
        Ahora mismo: península {euros(form.peninsula)} · Baleares {euros(form.baleares)} ·
        Canarias {euros(form.canarias)}.
      </p>
    </section>
  );
}
