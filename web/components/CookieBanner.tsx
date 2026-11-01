"use client";

import {
  acceptAllConsent,
  rejectOptionalConsent,
  useConsentDraft,
  useCookieConsent,
  writeConsent,
} from "@/lib/cookie-consent";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";

function hideBanner(path: string | null) {
  return (
    !path ||
    path.startsWith("/dashboard") ||
    path.startsWith("/panel") ||
    path.startsWith("/lista/") ||
    path.startsWith("/taller/") ||
    path === "/w" ||
    path.startsWith("/w/")
  );
}

export function CookieBanner() {
  const path = usePathname();
  const consent = useCookieConsent();
  const { analytics, marketing, setAnalytics, setMarketing, clearDraft } = useConsentDraft();
  const [detail, setDetail] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  const open = !hideBanner(path) && consent === null && !dismissed;
  if (!open) return null;

  function saveCustom() {
    writeConsent({ analytics, marketing });
    clearDraft();
    setDismissed(true);
  }

  return (
    <div
      role="dialog"
      aria-label="Preferencias de cookies"
      className="fixed inset-x-0 bottom-0 z-[80] border-t border-[#e6ddd0] bg-[#faf7f1]/95 p-4 shadow-[0_-8px_40px_rgba(28,25,21,0.12)] backdrop-blur-md sm:p-5"
    >
      <div className="mx-auto max-w-3xl">
        <p className="text-sm font-semibold text-[#1c1915]">Cookies y privacidad</p>
        <p className="mt-1.5 text-sm leading-relaxed text-[#5c564c]">
          Usamos cookies necesarias para que la tienda funcione. Con tu permiso, también
          medición propia y Meta Pixel (publicidad). Puedes cambiarlo cuando quieras. Más en{" "}
          <Link href="/cookies" className="underline underline-offset-2 hover:text-[#1c1915]">
            Cookies
          </Link>{" "}
          y{" "}
          <Link href="/privacidad" className="underline underline-offset-2 hover:text-[#1c1915]">
            Privacidad
          </Link>
          .
        </p>

        {detail ? (
          <div className="mt-3 space-y-2 rounded-2xl border border-[#e6ddd0] bg-white p-3 text-sm text-[#5c564c]">
            <label className="flex items-start gap-2">
              <input type="checkbox" checked disabled className="mt-1" />
              <span>
                <strong className="text-[#1c1915]">Necesarias</strong> — sesión de compra, seguridad
                y preferencias técnicas. Siempre activas.
              </span>
            </label>
            <label className="flex items-start gap-2">
              <input
                type="checkbox"
                checked={analytics}
                onChange={(e) => setAnalytics(e.target.checked)}
                className="mt-1"
              />
              <span>
                <strong className="text-[#1c1915]">Analítica</strong> — visitas agregadas en nuestro
                panel (sin vender datos a terceros).
              </span>
            </label>
            <label className="flex items-start gap-2">
              <input
                type="checkbox"
                checked={marketing}
                onChange={(e) => setMarketing(e.target.checked)}
                className="mt-1"
              />
              <span>
                <strong className="text-[#1c1915]">Marketing</strong> — Meta Pixel (Facebook /
                Instagram) para medir campañas.
              </span>
            </label>
          </div>
        ) : null}

        <div className="mt-4 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => {
              acceptAllConsent();
              clearDraft();
              setDismissed(true);
            }}
            className="rounded-full bg-[#1c1915] px-4 py-2 text-sm font-semibold text-[#f6f1e7]"
          >
            Aceptar todas
          </button>
          <button
            type="button"
            onClick={() => {
              rejectOptionalConsent();
              clearDraft();
              setDismissed(true);
            }}
            className="rounded-full bg-white px-4 py-2 text-sm ring-1 ring-[#e6ddd0]"
          >
            Solo necesarias
          </button>
          {detail ? (
            <button
              type="button"
              onClick={saveCustom}
              className="rounded-full bg-white px-4 py-2 text-sm ring-1 ring-[#e6ddd0]"
            >
              Guardar elección
            </button>
          ) : (
            <button
              type="button"
              onClick={() => setDetail(true)}
              className="rounded-full px-4 py-2 text-sm text-[#5c564c] underline underline-offset-2"
            >
              Configurar
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
