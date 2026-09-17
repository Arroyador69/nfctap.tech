"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function GscForm({ current }: { current: string }) {
  const router = useRouter();
  const [code, setCode] = useState(current);
  const [error, setError] = useState("");
  const [ok, setOk] = useState(false);
  const [busy, setBusy] = useState(false);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    setOk(false);
    const res = await fetch("/api/visit/settings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ googleVerification: code.trim() }),
    });
    const data = await res.json();
    setBusy(false);
    if (!res.ok) {
      setError(data.error || "No se pudo guardar");
      return;
    }
    setOk(true);
    router.refresh();
  }

  return (
    <form onSubmit={save} className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-end">
      <label className="flex-1 text-sm">
        <span className="text-[#7a7266]">Código google-site-verification</span>
        <input
          className="mt-1 w-full rounded-xl border border-[#e6ddd0] bg-white px-3 py-2 font-mono text-sm"
          value={code}
          onChange={(e) => setCode(e.target.value)}
          placeholder="pega aquí el content= de Google"
          autoComplete="off"
        />
      </label>
      <button
        disabled={busy}
        className="rounded-full bg-[#1c1915] px-5 py-2.5 text-sm font-medium text-[#f6f1e7] disabled:opacity-60"
      >
        {busy ? "Guardando…" : "Guardar y verificar"}
      </button>
      {error && <p className="text-sm text-red-700">{error}</p>}
      {ok && <p className="text-sm text-[#3d6b3a]">Guardado. En Search Console pulsa Verificar.</p>}
    </form>
  );
}
