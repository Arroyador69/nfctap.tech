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

        <section id="otros" className="mt-16">
          <p className="text-xs uppercase tracking-[0.2em] text-[#b0892c]">Otros productos NFC</p>
          <h2 className="mt-2 font-[family-name:var(--font-display)] text-3xl sm:text-4xl">
            TAP Wi‑Fi de pared
          </h2>
          <p className="mt-3 max-w-2xl text-[#5c564c]">
            Tus clientes tienen el Wi‑Fi y la contraseña configurados en el chip. Acercan el
            móvil y se conectan. Diseño fijo, con adhesivo para pared. Alquileres vacacionales,
            hoteles, restaurantes y cualquier negocio.
          </p>
          <article className="mt-8 grid items-center gap-6 rounded-[28px] border border-[#e6ddd0] bg-white p-5 sm:grid-cols-[minmax(0,220px)_1fr] sm:p-6">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/wifi-pared.jpg"
              alt="Placa NFC Wi‑Fi de pared TAP HERE"
              className="mx-auto w-full max-w-[220px] rounded-[22px] bg-[#f3eee4] object-cover"
            />
            <div className="flex flex-col">
              <p className="text-xs uppercase tracking-wider text-[#b0892c]">15 € · adhesivo incluido</p>
              <h3 className="mt-1 text-xl font-semibold">Wi‑Fi + TAP HERE</h3>
              <p className="mt-2 flex-1 text-sm text-[#6f675c]">
                No se personaliza el dibujo. Eliges colores de PLA (negro, blanco, rojo /
                amarillo). Lo ves en 3D. Al encargar nos das la red y la clave; nosotros
                programamos el NFC. Al pedir atriles te lo recomendamos también.
              </p>
              <p className="mt-4 text-4xl font-semibold">{euros(PRICE.wifi.first)}</p>
              <p className="text-sm text-[#8a8173]">cada una · envío a España en 24 h</p>
              <Link
                href="/wifi"
                className="mt-6 inline-block w-fit rounded-full bg-[#1c1915] px-5 py-2.5 text-center text-sm font-medium text-[#f6f1e7]"
              >
                Ver en 3D y encargar
              </Link>
            </div>
          </article>
        </section>

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
