"use client";

import { useState } from "react";

export function CaptacionPanel({
  defaultTo,
  salesStop,
  lastWaveAt,
  lastPlace,
}: {
  defaultTo: string;
  salesStop: boolean;
  lastWaveAt?: string;
  lastPlace?: string;
}) {
  const [to, setTo] = useState(defaultTo);
  const [busy, setBusy] = useState<"mail" | "tg" | "both" | null>(null);
  const [log, setLog] = useState("");

  async function run(mode: "mail" | "tg" | "both") {
    setBusy(mode);
    setLog("");
    try {
      const res = await fetch("/api/admin/outreach-test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          to: to.trim(),
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

  return (
    <div className="rounded-[24px] border border-[#e6ddd0] bg-white p-5">
      <h2 className="text-lg font-semibold">Pruebas (antes de oleadas)</h2>
      <p className="mt-1 text-sm text-[#6f675c]">
        1) Mail a ti · 2) Ping Telegram · 3) Solo entonces encender cron de oleadas.
        {salesStop ? " Hoy ya hay ≥5 ventas: no hace falta oleada." : null}
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
          disabled={Boolean(busy) || !to.includes("@")}
          onClick={() => run("both")}
          className="rounded-full bg-white px-4 py-2 text-sm ring-1 ring-[#e6ddd0] disabled:opacity-40"
        >
          {busy === "both" ? "Enviando…" : "Mail + Telegram"}
        </button>
      </div>

      {(lastWaveAt || lastPlace) && (
        <p className="mt-4 text-xs text-[#8a8173]">
          Última oleada: {lastWaveAt ? new Date(lastWaveAt).toLocaleString("es-ES") : "—"}
          {lastPlace ? ` · ${lastPlace}` : ""}
        </p>
      )}

      {log ? (
        <pre className="mt-4 max-h-48 overflow-auto rounded-xl bg-[#f7f3eb] p-3 text-xs text-[#1c1915]">
          {log}
        </pre>
      ) : null}

      <div className="mt-5 rounded-xl bg-[#f7f3eb] p-3 text-xs leading-5 text-[#5c564c]">
        <p className="font-medium text-[#1c1915]">Telegram · bot NFCTap</p>
        <ol className="mt-1 list-decimal space-y-1 pl-4">
          <li>Telegram → @BotFather → /newbot → nombre tipo NFCTap Oleadas</li>
          <li>Copia el token → Vercel: TELEGRAM_BOT_TOKEN</li>
          <li>Escríbele al bot, luego abre https://api.telegram.org/botTOKEN/getUpdates</li>
          <li>Copia tu chat.id → Vercel: TELEGRAM_CHAT_ID</li>
          <li>Redeploy y pulsa «Probar Telegram» aquí</li>
        </ol>
      </div>
    </div>
  );
}
