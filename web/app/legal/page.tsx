import { SocialLinks } from "@/components/SocialLinks";
import { BRAND, PRICE, packWas, productPrice, unicaPrice } from "@/lib/catalog";
import { pageMeta } from "@/lib/seo";
import { SHIPPING_POLICY } from "@/lib/shipping-policy";
import { DEFAULT_SHIPPING, euros } from "@/lib/shipping";
import Link from "next/link";

export const metadata = pageMeta({
  title: "Aviso legal y condiciones",
  description:
    "Aviso legal, condiciones de compra, envíos y privacidad de NFCTap. Atriles NFC impresos en España.",
  path: "/legal",
});

export default function LegalPage() {
  return (
    <div className="mx-auto max-w-2xl px-5 py-16 text-sm leading-7 text-[#4d473e]">
      <h1 className="font-[family-name:var(--font-display)] text-3xl text-[#1c1915]">
        Aviso legal y condiciones de compra
      </h1>
      <p className="mt-2 text-xs text-[#8a8173]">Última actualización: 1 de noviembre de 2026</p>

      <h2 className="mt-10 font-[family-name:var(--font-display)] text-2xl text-[#1c1915]">
        Identificación
      </h2>
      <p className="mt-3">
        {BRAND.name} opera la web{" "}
        <a href={BRAND.url} className="underline underline-offset-2">
          {BRAND.domain}
        </a>{" "}
        y vende atriles NFC y placas TAP Wi‑Fi impresos en España. Contacto:{" "}
        <a href={`mailto:${BRAND.email}`} className="underline underline-offset-2">
          {BRAND.email}
        </a>
        . Legislación aplicable: española y europea (RGPD, LSSI-CE, normativa de consumo).
      </p>
      <p className="mt-4">
        No hay partnership con Google, Meta ni WhatsApp. El NFC se programa con el enlace (o red
        Wi‑Fi) que facilita el comprador.
      </p>

      <h2 className="mt-10 font-[family-name:var(--font-display)] text-2xl text-[#1c1915]">
        Precios
      </h2>
      <ul className="mt-3 list-disc space-y-1 pl-5">
        <li>
          Google, WhatsApp o Instagram: primera {euros(PRICE.generica.first)} · cada una más{" "}
          {euros(PRICE.generica.extra)} (2 = {euros(productPrice("generica", 2))}, no{" "}
          {euros(packWas("generica", 2))}).
        </li>
        <li>
          Con logo: primera {euros(PRICE.personalizada.first)} · cada una más{" "}
          {euros(PRICE.personalizada.extra)} (2 = {euros(productPrice("personalizada", 2))}).
        </li>
        <li>
          Pieza «Tu negocio» (/negocio): desde {euros(unicaPrice(1))} (1 chip) ·{" "}
          {euros(unicaPrice(2))} (2 chips) · {euros(unicaPrice(3))} (3 chips).
        </li>
        <li>
          TAP Wi‑Fi de pared: {euros(PRICE.wifi.first)} cada una. Diseño fijo; adhesivo incluido.
        </li>
      </ul>
      <p className="mt-3">
        Polar cobra producto + envío. Los precios incluyen IVA cuando corresponda.
      </p>

      <h2 className="mt-10 font-[family-name:var(--font-display)] text-2xl text-[#1c1915]">
        Envío y plazos
      </h2>
      <p className="mt-3">{SHIPPING_POLICY.summary}</p>
      <p className="mt-3">
        Tarifas por zona y detalle completo:{" "}
        <Link href="/envios" className="underline underline-offset-2 hover:text-[#1c1915]">
          Política de envíos
        </Link>
        . Península gratis a partir de {euros(DEFAULT_SHIPPING.freePeninsulaFrom)} de producto.
      </p>

      <h2 className="mt-10 font-[family-name:var(--font-display)] text-2xl text-[#1c1915]">
        Pago
      </h2>
      <p className="mt-3">
        El pago lo gestiona Polar (tarjeta, Apple Pay y Bizum en España). Polar confirma el cobro y
        avisa a esta web.
      </p>

      <h2 className="mt-10 font-[family-name:var(--font-display)] text-2xl text-[#1c1915]">
        Producto a medida y desistimiento
      </h2>
      <p className="mt-3">
        Cada pieza se imprime y se programa con tus datos (logo, enlaces, Wi‑Fi). Son bienes
        personalizados: una vez fabricados no hay devolución salvo defecto de fabricación o de NFC.
        Si hay un fallo, escríbenos a {BRAND.email} y lo resolvemos.
      </p>

      <h2 className="mt-10 font-[family-name:var(--font-display)] text-2xl text-[#1c1915]">
        Privacidad, cookies y prospección
      </h2>
      <p className="mt-3">
        El tratamiento de datos personales se describe en la{" "}
        <Link href="/privacidad" className="underline underline-offset-2">
          Política de privacidad
        </Link>{" "}
        y en la{" "}
        <Link href="/cookies" className="underline underline-offset-2">
          Política de cookies
        </Link>
        . La prospección comercial B2B por email público se basa en interés legítimo (art. 6.1.f
        RGPD) con baja permanente disponible.
      </p>

      <p className="mt-8">Contacto: {BRAND.email}</p>

      <h2 className="mt-10 font-[family-name:var(--font-display)] text-2xl text-[#1c1915]">
        Redes
      </h2>
      <div className="mt-4">
        <SocialLinks heading={false} />
      </div>
    </div>
  );
}
