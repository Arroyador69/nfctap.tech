import type { Metadata } from "next";
import { NegocioShell } from "@/components/NegocioShell";
import { MetaViewContent } from "@/components/MetaPixel";
import { BRAND, unicaPrice, PRICE } from "@/lib/catalog";
import { pageMeta } from "@/lib/seo";

export const metadata: Metadata = pageMeta({
  title: `Tu logo + chips NFC · desde ${unicaPrice(1)} €`,
  description:
    "Pieza NFC con tu logo. 1–3 chips (web, Google, Instagram, WhatsApp…). La ves en 3D, la encargas en 2 minutos. Impresa en España y enviada en unos 2 días.",
  path: "/negocio",
});

export default function NegocioPage() {
  return (
    <main className="min-h-screen bg-[#f7f3eb] text-[#1c1915]">
      <MetaViewContent contentName="negocio" value={unicaPrice(2)} />

      <section className="mx-auto max-w-6xl px-5 pb-6 pt-12 sm:pt-14">
        <p className="text-xs uppercase tracking-[0.2em] text-[#b0892c]">nfctap.tech</p>
        <h1 className="mt-2 max-w-3xl font-[family-name:var(--font-display)] text-4xl sm:text-5xl">
          Tu logo en la barra. El cliente toca y entra.
        </h1>
        <p className="mt-4 max-w-2xl text-base leading-7 text-[#5c564c] sm:text-lg">
          Somos <strong>{BRAND.domain}</strong>. Fabricamos en España la pieza con tu marca y chips
          NFC: web, reseñas, redes o WhatsApp. La ves en 3D, la encargas en menos de 2 minutos y
          sale en unos 2 días. Desde <strong>{unicaPrice(2)} €</strong> con 2 chips
          (+{PRICE.unica.extra} € el tercero · 1 chip {unicaPrice(1)} €).
        </p>
      </section>

      <NegocioShell />
    </main>
  );
}
