"use client";

import {
  acceptAllConsent,
  readConsent,
  rejectOptionalConsent,
  writeConsent,
} from "@/lib/cookie-consent";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

export function CookieBanner() {
  const path = usePathname();
  const [open, setOpen] = useState(false);
  const [detail, setDetail] = useState(false);
  const [analytics, setAnalytics] = useState(false);
  const [marketing, setMarketing] = useState(false);

  useEffect(() => {
    if (
      path?.startsWith("/dashboard") ||
      path?.startsWith("/panel") ||
      path?.startsWith("/lista/") ||
      path?.startsWith("/taller/") ||
      path === "/w" ||
      path?.startsWith("/w/")
    ) {
      setOpen(false);
      return;
    }
    const c = readConsent();
    if (!c) setOpen(true);
  }, [path]);

  if (!open) return null;

  function saveCustom() {
    writeConsent({ analytics, marketing });
    setOpen(false);
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
              setOpen(false);
            }}
            className="rounded-full bg-[#1c1915] px-4 py-2 text-sm font-semibold text-[#f6f1e7]"
          >
            Aceptar todas
          </button>
          <button
            type="button"
            onClick={() => {
              rejectOptionalConsent();
              setOpen(false);
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
