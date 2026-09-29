"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function ContractAccept({
  clientId,
  clientName,
  packLabel,
  text,
}: {
  clientId: string;
  clientName: string;
  packLabel: string;
  text: string;
}) {
  const [ok, setOk] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const router = useRouter();

  async function accept() {
    if (!ok) return;
    setBusy(true);
    setErr("");
    try {
      const res = await fetch(`/api/panel/clients/${clientId}`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ action: "acceptContract" }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Error");
      router.replace("/panel/app");
      router.refresh();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Error");
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto min-h-[100dvh] max-w-lg px-4 pb-28 pt-[max(1rem,env(safe-area-inset-top))]">
      <p className="text-[0.7rem] uppercase tracking-[0.2em] text-[#b0892c]">Contrato · RGPD</p>
      <h1 className="mt-2 font-[family-name:var(--font-display)] text-3xl text-[#1c1915]">
        Condiciones del servicio
      </h1>
      <p className="mt-2 text-sm text-[#5c564c]">
        {clientName} · pack {packLabel}. Léelo una vez; luego entras al panel.
      </p>
      <pre className="mt-5 max-h-[50dvh] overflow-auto whitespace-pre-wrap rounded-3xl border border-[#e6ddd0] bg-white p-4 text-[13px] leading-relaxed text-[#3f3a34]">
        {text}
      </pre>
      <label className="mt-4 flex items-start gap-3 rounded-2xl border border-[#e6ddd0] bg-[#faf6ee] p-4 text-sm text-[#1c1915]">
        <input
          type="checkbox"
          checked={ok}
          onChange={(e) => setOk(e.target.checked)}
          className="mt-1 h-5 w-5"
        />
        <span>
          He leído y acepto el contrato, el tratamiento de datos (RGPD) y las condiciones
          del pack {packLabel}.
        </span>
      </label>
      {err ? (
        <p className="mt-3 rounded-2xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
          {err}
        </p>
      ) : null}
      <button
        type="button"
        disabled={!ok || busy}
        onClick={() => void accept()}
        className="mt-4 w-full rounded-2xl bg-[#1c1915] py-3.5 font-semibold text-[#f6f1e7] disabled:opacity-40"
      >
        {busy ? "Guardando…" : "Aceptar y entrar"}
      </button>
    </div>
  );
}
