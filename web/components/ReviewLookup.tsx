"use client";

import { useState } from "react";

export type PlaceHit = {
  name: string;
  address: string;
  reviewUrl: string;
  mapsUrl: string;
  placeId?: string;
  directReview: boolean;
  source: string;
};

type Props = {
  onPick?: (url: string, hit: PlaceHit) => void;
  compact?: boolean;
};

export function ReviewLookup({ onPick, compact }: Props) {
  const [q, setQ] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [hits, setHits] = useState<PlaceHit[]>([]);
  const [copied, setCopied] = useState("");

  async function search(e?: React.FormEvent) {
    e?.preventDefault();
    const query = q.trim();
    if (query.length < 3) {
      setError("Nombre y pueblo, o pega el enlace de Google.");
      return;
    }
    setBusy(true);
    setError("");
    setCopied("");
    try {
      const res = await fetch("/api/places", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ q: query }),
      });
      const data = (await res.json()) as { places?: PlaceHit[]; error?: string };
      if (!res.ok) {
        setHits([]);
        setError(data.error || "No se pudo buscar");
        return;
      }
      const places = data.places || [];
      setHits(places);
      if (!places.length) setError("Nada. Prueba con el pueblo o pega el enlace de Maps.");
    } catch {
      setError("Sin red. Reintenta.");
    } finally {
      setBusy(false);
    }
  }

  async function copy(url: string) {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(url);
    } catch {
      setCopied("");
    }
  }

  return (
    <div className={compact ? "" : "rounded-3xl border border-[#e6ddd0] bg-white p-5"}>
      {!compact && (
        <>
          <h2 className="font-[family-name:var(--font-display)] text-xl">Reseña Google</h2>
          <p className="mt-1 text-sm text-[#6f675c]">
            Nombre y pueblo, o pega el enlace de Maps / búsqueda. Te da el enlace para el NFC.
          </p>
        </>
      )}
      <form onSubmit={search} className={compact ? "flex gap-2" : "mt-4 flex gap-2"}>
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Casa Vacacional Alberto Fuengirola"
          className="min-h-12 flex-1 rounded-2xl border border-[#e6ddd0] bg-[#fffcf7] px-4 text-sm"
        />
        <button
          type="submit"
          disabled={busy}
          className="min-h-12 rounded-full bg-[#1c1915] px-5 text-sm font-semibold text-[#f6f1e7] disabled:opacity-50"
        >
          {busy ? "…" : "Buscar"}
        </button>
      </form>
      {error ? <p className="mt-3 text-sm text-red-700">{error}</p> : null}
      <ul className="mt-4 grid gap-3">
        {hits.map((h) => (
          <li key={h.reviewUrl} className="rounded-2xl bg-[#faf6ee] px-4 py-3">
            <p className="font-medium">{h.name}</p>
            {h.address ? <p className="mt-0.5 text-xs text-[#7a7266]">{h.address}</p> : null}
            <p className="mt-1 text-xs text-[#9a7420]">
              {h.directReview ? "Formulario de reseña" : "Abre la ficha en Maps (el cliente puede opinar)"}
            </p>
            <p className="mt-2 break-all text-xs text-[#5c564c]">{h.reviewUrl}</p>
            <div className="mt-3 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => copy(h.reviewUrl)}
                className="rounded-full bg-white px-3 py-1.5 text-xs ring-1 ring-[#e6ddd0]"
              >
                {copied === h.reviewUrl ? "Copiado" : "Copiar enlace"}
              </button>
              {onPick ? (
                <button
                  type="button"
                  onClick={() => onPick(h.reviewUrl, h)}
                  className="rounded-full bg-[#1c1915] px-3 py-1.5 text-xs text-[#f6f1e7]"
                >
                  Usar este
                </button>
              ) : (
                <a
                  href={`/dashboard/nuevo?googleUrl=${encodeURIComponent(h.reviewUrl)}`}
                  className="rounded-full bg-[#1c1915] px-3 py-1.5 text-xs text-[#f6f1e7]"
                >
                  Usar en pedido
                </a>
              )}
              <a
                href={h.reviewUrl}
                target="_blank"
                rel="noreferrer"
                className="rounded-full px-3 py-1.5 text-xs text-[#7a7266] underline"
              >
                Probar
              </a>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
