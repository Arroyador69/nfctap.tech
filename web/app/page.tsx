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
            Crea tu tarjeta
            <br />
            para que te dejen
            <br />
            reseñas.
          </h1>
          <p className="mt-5 max-w-md text-lg text-[#5c564c]">
            Atril vertical con NFC. El cliente acerca el móvil y se abre Google. Tú diseñas aquí;
            nosotros lo imprimimos tal cual.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link
              href="/personalizar"
              className="rounded-full bg-[#1c1915] px-6 py-3 font-semibold text-[#f6f1e7]"
            >
              Abrir el editor
            </Link>
            <Link href="/#precios" className="rounded-full border border-[#d9cfc0] px-6 py-3">
              Precios
            </Link>
          </div>
        </div>
        <CardPreview design={defaultDesign("personalizada")} />
      </section>

      <section className="mx-auto max-w-6xl px-5 pb-16">
        <div className="grid gap-4 md:grid-cols-3">
          {[
            ["1. La diseñas", "Nombre, texto y logo. El preview 3D enseña solo la cara frontal; el soporte se define al imprimir."],
            ["2. El cliente toca", "NFC programado a tu enlace de Google. Sin app, sin QR sucio, sin pedir el móvil."],
            ["3. Tú solo imprimes", "El pedido llega al dashboard con la cara lista. Nosotros (o tú) lo fabricáis."],
          ].map(([t, d]) => (
            <article key={t} className="rounded-[24px] border border-[#e6ddd0] bg-white/70 p-5">
              <h3 className="font-semibold">{t}</h3>
              <p className="mt-2 text-sm text-[#6f675c]">{d}</p>
            </article>
          ))}
        </div>
      </section>

      <section id="precios" className="mx-auto max-w-6xl px-5 pb-20">
        <h2 className="font-[family-name:var(--font-display)] text-4xl">Dos maneras de encargar</h2>
        <div className="mt-8 grid gap-5 md:grid-cols-2">
          <article className="rounded-[28px] border border-[#e6ddd0] bg-white p-6">
            <h3 className="text-xl font-semibold">Genérica</h3>
            <p className="mt-2 text-sm text-[#6f675c]">
              G de Google al centro y «Toca para dejar tu reseña». Programada a tu enlace.
            </p>
            <p className="mt-6 text-4xl font-semibold">{euros(PRICES.generica[1])}</p>
            <p className="text-sm text-[#8a8173]">una · dos {euros(PRICES.generica[2])}</p>
            <Link
              href="/personalizar?kind=generica"
              className="mt-6 inline-block rounded-full bg-[#f3eee4] px-5 py-2.5 text-sm"
            >
              Encargar genérica
            </Link>
          </article>
          <article className="rounded-[28px] border border-[#1c1915] bg-[#1c1915] p-6 text-[#f6f1e7]">
            <p className="text-xs uppercase tracking-wider text-[#e2b43a]">La que más se pide</p>
            <h3 className="mt-1 text-xl font-semibold">Personalizada</h3>
            <p className="mt-2 text-sm text-[#d5cbb8]">
              Nombre, texto y logo en un color. Preview de la cara frontal. El soporte se define al fabricar.
            </p>
            <p className="mt-6 text-4xl font-semibold">{euros(PRICES.personalizada[1])}</p>
            <p className="text-sm text-[#b9ae99]">
              una · dos {euros(PRICES.personalizada[2])} · envío península gratis
            </p>
            <Link
              href="/personalizar"
              className="mt-6 inline-block rounded-full bg-[#e2b43a] px-5 py-2.5 text-sm font-semibold text-[#1c1915]"
            >
              Crear la mía
            </Link>
          </article>
        </div>
      </section>
    </>
  );
}
