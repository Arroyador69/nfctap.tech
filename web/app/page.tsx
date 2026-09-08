import { CardPreview } from "@/components/CardPreview";
import { BRAND, PRICES, defaultDesign } from "@/lib/catalog";
import { euros } from "@/lib/shipping";
import Link from "next/link";

export default function HomePage() {
  return (
    <>
      <section className="mx-auto grid max-w-6xl items-center gap-8 px-5 py-8 sm:gap-12 sm:py-14 lg:grid-cols-[1fr_1.05fr] lg:py-20">
        <div>
          <p className="mb-3 text-xs uppercase tracking-[0.22em] text-[#b0892c]">{BRAND.domain}</p>
          <h1 className="font-[family-name:var(--font-display)] text-[2.15rem] leading-[1.08] text-[#1c1915] sm:text-5xl lg:text-6xl">
            TAP.
            <br />
            Reseña en Google.
            <br />
            En la barra.
          </h1>
          <p className="mt-5 max-w-md text-lg text-[#5c564c]">
            Atril NFC impreso en España. El cliente acerca el móvil y se abre tu reseña.
            Lo ves en 3D, lo encargas aquí y te llega programado.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link
              href="/personalizar"
              className="rounded-full bg-[#1c1915] px-6 py-3 font-semibold text-[#f6f1e7]"
            >
              Encargar la mía
            </Link>
            <Link href="/#precios" className="rounded-full border border-[#d9cfc0] px-6 py-3">
              Ver precios
            </Link>
          </div>
        </div>
        <CardPreview design={defaultDesign("generica")} />
      </section>

      <section className="mx-auto max-w-6xl px-5 pb-16">
        <div className="grid gap-4 md:grid-cols-3">
          {[
            ["1. Eliges", "Genérica con la G, personalizada con tu logo, o pieza única de tu negocio con dos NFC."],
            ["2. TAP", "Acerca el móvil. Se abre Google Reviews. Sin app, sin QR sucio."],
            ["3. Te lo enviamos", "Impreso en PLA, hueco NFC a la vista, programado a tu enlace. España."],
          ].map(([t, d]) => (
            <article key={t} className="rounded-[24px] border border-[#e6ddd0] bg-white/70 p-5">
              <h3 className="font-semibold">{t}</h3>
              <p className="mt-2 text-sm text-[#6f675c]">{d}</p>
            </article>
          ))}
        </div>
      </section>

      <section id="precios" className="mx-auto max-w-6xl px-5 pb-20">
        <h2 className="font-[family-name:var(--font-display)] text-4xl">Tres maneras de encargar</h2>
        <p className="mt-3 max-w-xl text-[#5c564c]">
          El mismo atril que ves en 3D es el que se imprime. Precios en euros, IVA no incluido si
          aplica. Envío a España.
        </p>
        <div className="mt-8 grid gap-5 md:grid-cols-3">
          <article className="flex flex-col rounded-[28px] border border-[#e6ddd0] bg-white p-6">
            <h3 className="text-xl font-semibold">Genérica</h3>
            <p className="mt-2 flex-1 text-sm text-[#6f675c]">
              G de Google, TAP / RESEÑA, estrellas y hueco NFC. Programada a tu enlace de reseña.
            </p>
            <p className="mt-6 text-4xl font-semibold">{euros(PRICES.generica[1])}</p>
            <p className="text-sm text-[#8a8173]">una · dos {euros(PRICES.generica[2])}</p>
            <Link
              href="/personalizar?kind=generica"
              className="mt-6 inline-block rounded-full bg-[#f3eee4] px-5 py-2.5 text-center text-sm"
            >
              Encargar genérica
            </Link>
          </article>
          <article className="flex flex-col rounded-[28px] border border-[#1c1915] bg-[#1c1915] p-6 text-[#f6f1e7]">
            <p className="text-xs uppercase tracking-wider text-[#e2b43a]">La de barra</p>
            <h3 className="mt-1 text-xl font-semibold">Personalizada</h3>
            <p className="mt-2 flex-1 text-sm text-[#d5cbb8]">
              El mismo atril. Tu logo en el acento, TAP / RESEÑA y estrellas. El nombre es opcional.
            </p>
            <p className="mt-6 text-4xl font-semibold">{euros(PRICES.personalizada[1])}</p>
            <p className="text-sm text-[#b9ae99]">
              una · dos {euros(PRICES.personalizada[2])}
            </p>
            <Link
              href="/personalizar"
              className="mt-6 inline-block rounded-full bg-[#e2b43a] px-5 py-2.5 text-center text-sm font-semibold text-[#1c1915]"
            >
              Crear la mía
            </Link>
          </article>
          <article className="flex flex-col rounded-[28px] border border-[#e6ddd0] bg-white p-6">
            <p className="text-xs uppercase tracking-wider text-[#b0892c]">A medida</p>
            <h3 className="mt-1 text-xl font-semibold">Pieza única</h3>
            <p className="mt-2 flex-1 text-sm text-[#6f675c]">
              La de tu negocio: logo y dos NFC (reseña Google + carta, Instagram o menú). Una
              pieza.
            </p>
            <p className="mt-6 text-4xl font-semibold">{euros(PRICES.unica[1])}</p>
            <p className="text-sm text-[#8a8173]">una · envío península gratis</p>
            <Link
              href="/personalizar?kind=unica"
              className="mt-6 inline-block rounded-full bg-[#f3eee4] px-5 py-2.5 text-center text-sm"
            >
              Encargar pieza única
            </Link>
          </article>
        </div>
      </section>
    </>
  );
}
