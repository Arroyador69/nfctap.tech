"use client";

import {
  acceptAllConsent,
  rejectOptionalConsent,
  useConsentDraft,
  writeConsent,
} from "@/lib/cookie-consent";
import { BRAND } from "@/lib/catalog";
import Link from "next/link";
import { useState } from "react";

export default function CookiesPage() {
  const { analytics, marketing, setAnalytics, setMarketing, clearDraft } = useConsentDraft();
  const [saved, setSaved] = useState(false);

  return (
    <div className="mx-auto max-w-2xl px-5 py-16 text-sm leading-7 text-[#4d473e]">
      <h1 className="font-[family-name:var(--font-display)] text-3xl text-[#1c1915]">
        Política de cookies
      </h1>
      <p className="mt-2 text-xs text-[#8a8173]">Última actualización: 1 de noviembre de 2026</p>
      <p className="mt-6">
        Esta web ({BRAND.domain}) utiliza cookies y tecnologías similares conforme a la normativa
        europea y española (RGPD, LSSI-CE). Puedes aceptar, rechazar o configurar las no esenciales.
      </p>

      <h2 className="mt-10 font-[family-name:var(--font-display)] text-2xl text-[#1c1915]">
        Tipos de cookies
      </h2>
      <ul className="mt-3 list-disc space-y-2 pl-5">
        <li>
          <strong>Necesarias:</strong> funcionamiento de la tienda, seguridad y preferencias
          técnicas (p. ej. tu elección de cookies). No requieren consentimiento.
        </li>
        <li>
          <strong>Analítica:</strong> medición de visitas en nuestro panel interno (beacon propio).
          Solo con tu consentimiento.
        </li>
        <li>
          <strong>Marketing:</strong> Meta Pixel (Facebook / Instagram) para medir campañas y
          audiencias. Solo con tu consentimiento.
        </li>
      </ul>

      <h2 className="mt-10 font-[family-name:var(--font-display)] text-2xl text-[#1c1915]">
        Gestionar preferencias
      </h2>
      <div className="mt-4 space-y-3 rounded-2xl border border-[#e6ddd0] bg-white p-4">
        <label className="flex items-start gap-2">
          <input type="checkbox" checked disabled className="mt-1" />
          <span>Necesarias (siempre activas)</span>
        </label>
        <label className="flex items-start gap-2">
          <input
            type="checkbox"
            checked={analytics}
            onChange={(e) => setAnalytics(e.target.checked)}
            className="mt-1"
          />
          <span>Analítica</span>
        </label>
        <label className="flex items-start gap-2">
          <input
            type="checkbox"
            checked={marketing}
            onChange={(e) => setMarketing(e.target.checked)}
            className="mt-1"
          />
          <span>Marketing (Meta Pixel)</span>
        </label>
        <div className="flex flex-wrap gap-2 pt-2">
          <button
            type="button"
            className="rounded-full bg-[#1c1915] px-4 py-2 text-sm text-[#f6f1e7]"
            onClick={() => {
              writeConsent({ analytics, marketing });
              clearDraft();
              setSaved(true);
            }}
          >
            Guardar
          </button>
          <button
            type="button"
            className="rounded-full bg-white px-4 py-2 text-sm ring-1 ring-[#e6ddd0]"
            onClick={() => {
              acceptAllConsent();
              clearDraft();
              setSaved(true);
            }}
          >
            Aceptar todas
          </button>
          <button
            type="button"
            className="rounded-full bg-white px-4 py-2 text-sm ring-1 ring-[#e6ddd0]"
            onClick={() => {
              rejectOptionalConsent();
              clearDraft();
              setSaved(true);
            }}
          >
            Solo necesarias
          </button>
        </div>
        {saved ? (
          <p className="text-xs text-emerald-800">Preferencias guardadas en este dispositivo.</p>
        ) : null}
      </div>

      <h2 className="mt-10 font-[family-name:var(--font-display)] text-2xl text-[#1c1915]">
        Más información
      </h2>
      <p className="mt-3">
        Detalle del tratamiento:{" "}
        <Link href="/privacidad" className="underline underline-offset-2">
          Política de privacidad
        </Link>
        . Contacto:{" "}
        <a href={`mailto:${BRAND.email}`} className="underline underline-offset-2">
          {BRAND.email}
        </a>
        .
      </p>
    </div>
  );
}
