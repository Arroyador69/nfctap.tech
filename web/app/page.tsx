import { HomeHero } from "@/components/HomeHero";
import { BRAND, FACE_MODELS, MAX_QTY, PRICE, PRICES, packSaving, packWas, productPrice } from "@/lib/catalog";
import { euros } from "@/lib/shipping";
import Link from "next/link";

export default function HomePage() {
  return (
    <>
      <HomeHero />

      <section className="mx-auto max-w-6xl px-5 pb-16">
        <div className="grid gap-4 md:grid-cols-3">
          {[
            ["1. Eliges", "WhatsApp, Instagram o Google. Las que quieras, las cantidades que quieras."],
            ["2. TAP", "Acerca el móvil. Se abre el enlace. Sin app, sin QR sucio."],
            ["3. En 24 h", "Lo imprimimos, programamos el NFC y Correos lo lleva. España."],
          ].map(([t, d]) => (
            <article key={t} className="rounded-[24px] border border-[#e6ddd0] bg-white/70 p-5">
              <h3 className="font-semibold">{t}</h3>
              <p className="mt-2 text-sm text-[#6f675c]">{d}</p>
            </article>
          ))}
        </div>
      </section>

      <section id="precios" className="mx-auto max-w-6xl px-5 pb-20">
        <h2 className="font-[family-name:var(--font-display)] text-4xl">Encarga la tuya</h2>
        <p className="mt-3 max-w-xl text-[#5c564c]">
          El mismo atril que ves en 3D es el que se imprime. La primera no es el doble de las
          siguientes. Hasta {MAX_QTY} en un pedido. Envío a España en 24 h. Pago con Polar:
          tarjeta, Apple Pay o Bizum.
        </p>
        <div className="mt-8 grid gap-5 md:grid-cols-2">
          <article className="flex flex-col rounded-[28px] border border-[#e6ddd0] bg-white p-6">
            <h3 className="text-xl font-semibold">Google, WhatsApp o Instagram</h3>
            <p className="mt-2 flex-1 text-sm text-[#6f675c]">
              {FACE_MODELS.map((m) => m.label).join(", ")}. Programada al enlace que pongas al
              encargar. Mezcla modelos y cantidades.
            </p>
            <p className="mt-6 text-4xl font-semibold">{euros(PRICE.generica.first)}</p>
            <p className="text-sm text-[#8a8173]">la primera</p>
            <p className="mt-3 text-lg font-semibold text-[#1c1915]">
              Cada una más {euros(PRICE.generica.extra)}
            </p>
            <p className="text-sm text-[#8a8173]">
              2 = {euros(productPrice("generica", 2))} (no {euros(packWas("generica", 2))}, ahorras{" "}
              {euros(packSaving("generica", 2))}) · 3 = {euros(productPrice("generica", 3))}
            </p>
            <Link
              href="/personalizar"
              className="mt-6 inline-block rounded-full bg-[#f3eee4] px-5 py-2.5 text-center text-sm"
            >
              Elegir y encargar
            </Link>
          </article>
          <article className="flex flex-col rounded-[28px] border border-[#1c1915] bg-[#1c1915] p-6 text-[#f6f1e7]">
            <p className="text-xs uppercase tracking-wider text-[#e2b43a]">La de barra</p>
            <h3 className="mt-1 text-xl font-semibold">Con tu logo</h3>
            <p className="mt-2 flex-1 text-sm text-[#d5cbb8]">
              El mismo atril. Tu marca, TAP y estrellas. El nombre es opcional.
            </p>
            <p className="mt-6 text-4xl font-semibold">{euros(PRICE.personalizada.first)}</p>
            <p className="text-sm text-[#b9ae99]">la primera</p>
            <p className="mt-3 text-lg font-semibold">
              Cada una más {euros(PRICE.personalizada.extra)}
            </p>
            <p className="text-sm text-[#b9ae99]">
              2 = {euros(productPrice("personalizada", 2))} (no {euros(packWas("personalizada", 2))})
            </p>
            <Link
              href="/personalizar?kind=personalizada"
              className="mt-6 inline-block rounded-full bg-[#e2b43a] px-5 py-2.5 text-center text-sm font-semibold text-[#1c1915]"
            >
              Crear la mía
            </Link>
          </article>
        </div>

        <p className="mt-10 max-w-2xl text-sm leading-6 text-[#6f675c]">
          <span className="font-semibold text-[#1c1915]">Hasta {MAX_QTY} por pedido. </span>
          Las cantidades se eligen en la página de encargo. Si necesitas más,{" "}
          <a className="underline decoration-[#d9cfc0] underline-offset-2" href={`mailto:${BRAND.email}`}>
            {BRAND.email}
          </a>
          .
        </p>
        <p className="mt-4 max-w-2xl text-sm leading-6 text-[#6f675c]">
          <span className="font-semibold text-[#1c1915]">Pieza única · {euros(PRICES.unica[1])}. </span>
          Pieza a medida de tu negocio (forma, logo, dos NFC). Cada caso se diseña aparte: no
          se encarga desde aquí.{" "}
          <a className="underline decoration-[#d9cfc0] underline-offset-2" href={`mailto:${BRAND.email}`}>
            {BRAND.email}
          </a>
          .
        </p>
      </section>
    </>
  );
}
