"use client";

import { isDirectReviewUrl, isGooglePlaceInput } from "@/lib/google-url";
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

export async function fetchReviewFromInput(q: string): Promise<PlaceHit | null> {
  const query = q.trim();
  if (query.length < 3) return null;
  const res = await fetch("/api/places", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ q: query }),
  });
  const data = (await res.json()) as { places?: PlaceHit[] };
  const places = data.places || [];
  return places.find((p) => p.directReview) || null;
}

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
      setError("Pega el enlace de Google Maps o del perfil de empresa.");
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
      const reviews = places.filter((p) => p.directReview);
      setHits(reviews.length ? reviews : places);
      if (!places.length) {
        setError(
          "No saqué el enlace de reseña. Pega el de Google Maps (compartir ficha) o el perfil de empresa.",
        );
        return;
      }
      if (!reviews.length) {
        setError("Ese enlace abre Maps, no el formulario de reseña. Prueba el de compartir la ficha o el perfil de empresa.");
        return;
      }
      if (reviews.length === 1 && onPick) onPick(reviews[0].reviewUrl, reviews[0]);
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
            Pega el enlace de Google Maps o del perfil de empresa. Te da el de escribir
            reseña para el NFC. Ábrelo con Probar y comprueba que pide una opinión.
          </p>
        </>
      )}
      <form onSubmit={search} className={compact ? "flex gap-2" : "mt-4 flex gap-2"}>
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="https://maps.app.goo.gl/…"
          className="min-h-12 flex-1 rounded-2xl border border-[#e6ddd0] bg-[#fffcf7] px-4 text-sm"
        />
        <button
          type="submit"
          disabled={busy}
          className="min-h-12 rounded-full bg-[#1c1915] px-5 text-sm font-semibold text-[#f6f1e7] disabled:opacity-50"
        >
          {busy ? "…" : "Sacar reseña"}
        </button>
      </form>
      {error ? <p className="mt-3 text-sm text-red-700">{error}</p> : null}
      <ul className="mt-4 grid gap-3">
        {hits.map((h) => (
          <li key={h.reviewUrl} className="rounded-2xl bg-[#faf6ee] px-4 py-3">
            <p className="font-medium">{h.name}</p>
            {h.address ? <p className="mt-0.5 text-xs text-[#7a7266]">{h.address}</p> : null}
            <p className="mt-1 text-xs text-[#9a7420]">
              {h.directReview
                ? "Enlace de reseña. Comprueba que abre escribir una opinión."
                : "Abre Maps, no el formulario de reseña."}
            </p>
            <p className="mt-2 break-all text-xs text-[#5c564c]">{h.reviewUrl}</p>
            <div className="mt-3 flex flex-wrap gap-2">
              {h.directReview ? (
                <button
                  type="button"
                  onClick={() => copy(h.reviewUrl)}
                  className="rounded-full bg-white px-3 py-1.5 text-xs ring-1 ring-[#e6ddd0]"
                >
                  {copied === h.reviewUrl ? "Copiado" : "Copiar enlace"}
                </button>
              ) : null}
              {h.directReview && onPick ? (
                <button
                  type="button"
                  onClick={() => onPick(h.reviewUrl, h)}
                  className="rounded-full bg-[#1c1915] px-3 py-1.5 text-xs text-[#f6f1e7]"
                >
                  Usar este
                </button>
              ) : null}
              {h.directReview && !onPick ? (
                <a
                  href={`/dashboard/nuevo?googleUrl=${encodeURIComponent(h.reviewUrl)}`}
                  className="rounded-full bg-[#1c1915] px-3 py-1.5 text-xs text-[#f6f1e7]"
                >
                  Usar en pedido
                </a>
              ) : null}
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

export { isDirectReviewUrl, isGooglePlaceInput };
