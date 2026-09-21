"use client";

import { useState } from "react";

export function SeoDraftForm({ configured }: { configured: boolean }) {
  const [topic, setTopic] = useState("");
  const [draft, setDraft] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(false);

  async function run(e: React.FormEvent) {
    e.preventDefault();
    if (!configured) return;
    setBusy(true);
    setError("");
    setDraft("");
    setCopied(false);
    const res = await fetch("/api/seo/draft", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ topic: topic.trim() }),
    });
    const data = (await res.json()) as { draft?: string; error?: string };
    setBusy(false);
    if (!res.ok) {
      setError(data.error || "No se pudo generar");
      return;
    }
    setDraft(data.draft || "");
  }

  async function copy() {
    if (!draft) return;
    await navigator.clipboard.writeText(draft);
    setCopied(true);
  }

  return (
    <div className="mt-6">
      <form onSubmit={run} className="flex flex-col gap-3">
        <label className="text-sm">
          <span className="text-[#7a7266]">Tema o búsqueda</span>
          <input
            className="mt-1 w-full rounded-xl border border-[#e6ddd0] bg-white px-3 py-2 text-sm"
            value={topic}
            onChange={(e) => setTopic(e.target.value)}
            placeholder="atril NFC reseñas Google bar España"
            disabled={!configured || busy}
          />
        </label>
        <button
          disabled={!configured || busy || topic.trim().length < 8}
          className="self-start rounded-full bg-[#1c1915] px-5 py-2.5 text-sm font-medium text-[#f6f1e7] disabled:opacity-60"
        >
          {busy ? "Escribiendo…" : "Borrador"}
        </button>
      </form>
      {error && <p className="mt-3 text-sm text-red-700">{error}</p>}
      {draft ? (
        <div className="mt-4">
          <div className="flex items-center justify-between gap-3">
            <p className="text-xs uppercase tracking-[0.16em] text-[#b0892c]">Borrador · no publicado</p>
            <button type="button" onClick={copy} className="text-sm underline decoration-[#d9cfc0]">
              {copied ? "Copiado" : "Copiar"}
            </button>
          </div>
          <pre className="mt-2 whitespace-pre-wrap rounded-[22px] border border-[#e6ddd0] bg-[#faf6ee] p-4 text-sm leading-6 text-[#3f3a34]">
            {draft}
          </pre>
        </div>
      ) : null}
    </div>
  );
}
