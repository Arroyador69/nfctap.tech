"use client";

import { useState } from "react";

/**
 * Solo estado / pruebas opcionales.
 * Las oleadas van solas por cron (no hace falta pulsar nada).
 */
export function CaptacionPanel({
  salesStop,
  lastWaveAt,
  lastPlace,
  queued = 0,
}: {
  defaultTo?: string;
  salesStop: boolean;
  lastWaveAt?: string;
  lastPlace?: string;
  queued?: number;
}) {
  const [busy, setBusy] = useState(false);
  const [log, setLog] = useState("");

  async function pingTelegram() {
    setBusy(true);
    setLog("");
    try {
      const res = await fetch("/api/admin/outreach-test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mail: false, telegram: true }),
      });
      setLog(JSON.stringify(await res.json(), null, 2));
    } catch (e) {
      setLog(e instanceof Error ? e.message : "Error de red");
    }
    setBusy(false);
  }

  return (
    <div className="rounded-[24px] border border-[#e6ddd0] bg-white p-5">
      <h2 className="text-lg font-semibold">Automático · no toques nada</h2>
      <p className="mt-1 text-sm text-[#6f675c]">
        El cron rellena la cola, envía hasta <strong>500 mails/día</strong> (ritmo anti-ban) y para
        si hay <strong>≥10 ventas</strong> en /negocio. Telegram te avisa a las 12:00, 16:00 y
        21:00 (Madrid).
        {salesStop ? " Hoy ya estáis en meta: oleadas en STOP." : null}
      </p>

      <ul className="mt-4 space-y-2 text-sm text-[#5c564c]">
        <li>
          Cola lista: <strong className="tabular-nums text-[#1c1915]">{queued}</strong> (objetivo
          ~1000 = hoy + mañana)
        </li>
        <li>
          Última oleada:{" "}
          {lastWaveAt ? new Date(lastWaveAt).toLocaleString("es-ES") : "aún no"}
          {lastPlace ? ` · ${lastPlace}` : ""}
        </li>
        <li>Ventana envío: 08:00–17:00 · 10×50 · 1,8 s entre mails</li>
      </ul>

      <button
        type="button"
        disabled={busy}
        onClick={() => void pingTelegram()}
        className="mt-5 rounded-full bg-white px-4 py-2 text-sm ring-1 ring-[#e6ddd0] disabled:opacity-40"
      >
        {busy ? "Enviando…" : "Probar Telegram (opcional)"}
      </button>

      {log ? (
        <pre className="mt-4 max-h-40 overflow-auto rounded-xl bg-[#f7f3eb] p-3 text-xs text-[#1c1915]">
          {log}
        </pre>
      ) : null}
    </div>
  );
}
