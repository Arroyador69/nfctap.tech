"use client";

import { NFC_TEST_CITIES } from "@/lib/business-leads/places";
import { useState } from "react";

export function CaptacionPanel({
  defaultTo,
  salesStop,
  lastWaveAt,
  lastPlace,
  queued = 0,
}: {
  defaultTo: string;
  salesStop: boolean;
  lastWaveAt?: string;
  lastPlace?: string;
  queued?: number;
}) {
  const [to, setTo] = useState(defaultTo);
  const [city, setCity] = useState("Fuengirola");
  const [businessName, setBusinessName] = useState("");
  const [busy, setBusy] = useState<"mail" | "tg" | "both" | "discover" | null>(null);
  const [log, setLog] = useState("");
  const [queueN, setQueueN] = useState(queued);

  async function run(mode: "mail" | "tg" | "both") {
    setBusy(mode);
    setLog("");
    try {
      const res = await fetch("/api/admin/outreach-test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          to: to.trim(),
          city,
          businessName: businessName.trim() || undefined,
          mail: mode === "mail" || mode === "both",
          telegram: mode === "tg" || mode === "both",
        }),
      });
      const data = await res.json();
      setLog(JSON.stringify(data, null, 2));
    } catch (e) {
      setLog(e instanceof Error ? e.message : "Error de red");
    }
    setBusy(null);
  }

  async function discover() {
    setBusy("discover");
    setLog("Descubriendo emails públicos (OSM)… puede tardar 1–2 min.");
    try {
      const res = await fetch("/api/admin/outreach-discover", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ targetQueued: 1000, maxPlaces: 12, fetchWebEmails: true }),
      });
      const data = await res.json();
      if (data.queue?.queued != null) setQueueN(data.queue.queued);
      setLog(JSON.stringify(data, null, 2));
    } catch (e) {
      setLog(e instanceof Error ? e.message : "Error de red");
    }
    setBusy(null);
  }

  return (
    <div className="rounded-[24px] border border-[#e6ddd0] bg-white p-5">
      <h2 className="text-lg font-semibold">Pruebas + cola</h2>
      <p className="mt-1 text-sm text-[#6f675c]">
        El asunto lleva la <strong>ciudad del lead</strong> (cámbiala abajo y verás que cambia).
        Sin «Café de prueba»: el titular es «Tu logo en la barra» para cualquier negocio.
        {salesStop ? " Hoy ya hay ≥10 ventas: no hace falta oleada." : null}
      </p>

      <p className="mt-3 text-sm font-medium text-[#1c1915]">
        Cola lista: <span className="tabular-nums">{queueN}</span> · objetivo ≥1000 (500 hoy + 500
        mañana)
      </p>

      <label className="mt-4 block text-sm font-medium">
        Tu email de prueba
        <input
          value={to}
          onChange={(e) => setTo(e.target.value)}
          type="email"
          placeholder="tu@email.com"
          className="mt-2 w-full rounded-xl border border-[#e6ddd0] px-3 py-2"
        />
      </label>

      <label className="mt-3 block text-sm font-medium">
        Ciudad del mail (cambia y prueba)
        <select
          value={city}
          onChange={(e) => setCity(e.target.value)}
          className="mt-2 w-full rounded-xl border border-[#e6ddd0] px-3 py-2"
        >
          {NFC_TEST_CITIES.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
      </label>

      <label className="mt-3 block text-sm font-medium">
        Nombre del negocio (opcional)
        <input
          value={businessName}
          onChange={(e) => setBusinessName(e.target.value)}
          placeholder="Vacío = genérico · o «Clínica Sol», «Hotel Mar»…"
          className="mt-2 w-full rounded-xl border border-[#e6ddd0] px-3 py-2"
          maxLength={48}
        />
      </label>

      <div className="mt-4 flex flex-wrap gap-2">
        <button
          type="button"
          disabled={Boolean(busy) || !to.includes("@")}
          onClick={() => run("mail")}
          className="rounded-full bg-[#1c1915] px-4 py-2 text-sm text-[#f6f1e7] disabled:opacity-40"
        >
          {busy === "mail" ? "Enviando…" : "Probar mail Resend"}
        </button>
        <button
          type="button"
          disabled={Boolean(busy)}
          onClick={() => run("tg")}
          className="rounded-full bg-white px-4 py-2 text-sm ring-1 ring-[#e6ddd0] disabled:opacity-40"
        >
          {busy === "tg" ? "Enviando…" : "Probar Telegram"}
        </button>
        <button
          type="button"
          disabled={Boolean(busy)}
          onClick={() => void discover()}
          className="rounded-full bg-[#b0892c] px-4 py-2 text-sm text-white disabled:opacity-40"
        >
          {busy === "discover" ? "Buscando…" : "Rellenar cola (~1000)"}
        </button>
      </div>

      {(lastWaveAt || lastPlace) && (
        <p className="mt-4 text-xs text-[#8a8173]">
          Última oleada: {lastWaveAt ? new Date(lastWaveAt).toLocaleString("es-ES") : "—"}
          {lastPlace ? ` · ${lastPlace}` : ""}
        </p>
      )}

      {log ? (
        <pre className="mt-4 max-h-56 overflow-auto rounded-xl bg-[#f7f3eb] p-3 text-xs text-[#1c1915]">
          {log}
        </pre>
      ) : null}

      <div className="mt-5 rounded-xl bg-[#f7f3eb] p-3 text-xs leading-5 text-[#5c564c]">
        <p className="font-medium text-[#1c1915]">Oleadas (automático)</p>
        <ul className="mt-1 list-disc space-y-1 pl-4">
          <li>Cron laboral 8–16 Madrid · 50 mails/oleada · tope 500/día</li>
          <li>Si hay ≥10 ventas /negocio → STOP ese día</li>
          <li>RGPD: emails públicos · baja one-click · art. 6.1.f interés legítimo B2B</li>
        </ul>
      </div>
    </div>
  );
}
