import type { Metadata } from "next";
import { NegocioOrder } from "@/components/NegocioOrder";
import { BRAND, PRICE, unicaPrice } from "@/lib/catalog";

export const metadata: Metadata = {
  title: `Tu negocio con logo · desde ${unicaPrice(1)} € | ${BRAND.name}`,
  description:
    "Atril NFC con tu logo. 1, 2 o 3 chips (Google, Instagram u otro enlace). Referencias reales: Markos Peluqueros y Freddo's. Envío a toda España.",
};

export default function NegocioPage() {
  return (
    <main className="min-h-screen bg-[#f7f3eb] text-[#1c1915]">
      <section className="mx-auto max-w-6xl px-5 pb-8 pt-14">
        <p className="text-xs uppercase tracking-[0.2em] text-[#b0892c]">Producto a medida</p>
        <h1 className="mt-2 font-[family-name:var(--font-display)] text-4xl sm:text-5xl">
          Tu logo en la barra. El cliente toca y entra.
        </h1>
        <p className="mt-4 max-w-2xl text-lg leading-7 text-[#5c564c]">
          Somos <strong>nfctap.tech</strong>. Misma pieza que Markos o Freddo&apos;s: solo cambia
          tu logo en el círculo. Eliges 1–3 chips (web, Google, Instagram, WhatsApp…) y lo
          encargas en menos de 2 minutos. Base <strong>{unicaPrice(2)} €</strong> con 2 chips · 1
          chip {unicaPrice(1)} € · 3 chips {unicaPrice(3)} € (+{PRICE.unica.extra} € el tercero).
          Fabricación y envío en unos 2 días, España.
        </p>
      </section>

      <section className="mx-auto grid max-w-6xl gap-4 px-5 pb-10 md:grid-cols-3">
        {[
          {
            src: "/stock/markos.jpg",
            title: "Markos Peluqueros",
            blurb: "Logo + Google · App · Instagram",
          },
          {
            src: "/stock/freddos.jpg",
            title: "Freddo's Coffee",
            blurb: "Logo + reseña + clubcard",
          },
          {
            src: "/stock/google-barra.jpg",
            title: "Atril Google (stock)",
            blurb: "Negro + blanco · barra",
          },
        ].map((card) => (
          <figure
            key={card.src}
            className="overflow-hidden rounded-[24px] border border-[#e6ddd0] bg-white"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={card.src} alt={card.title} className="aspect-[4/3] w-full object-cover" />
            <figcaption className="p-4">
              <p className="font-semibold">{card.title}</p>
              <p className="text-sm text-[#6f675c]">{card.blurb}</p>
            </figcaption>
          </figure>
        ))}
      </section>

      <NegocioOrder />
    </main>
  );
}
