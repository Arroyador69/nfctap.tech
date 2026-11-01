import { BRAND, PRICE, packSaving, packWas, productPrice } from "@/lib/catalog";
import { pageMeta } from "@/lib/seo";
import { SHIPPING_POLICY } from "@/lib/shipping-policy";
import { DEFAULT_SHIPPING, ZONE_LABEL, euros } from "@/lib/shipping";
import { getShipping } from "@/lib/store";
import Link from "next/link";

export const dynamic = "force-dynamic";
export const metadata = pageMeta({
  title: "Envíos y plazos",
  description:
    "Política de fabricación y envío NFCTap: ~72 h laborables, sale el día laborable siguiente, hasta 15 días en picos. Correos solo España.",
  path: "/envios",
});

export default async function EnviosPage() {
  const s = await getShipping();
  return (
    <div className="mx-auto max-w-2xl px-5 py-16">
      <h1 className="font-[family-name:var(--font-display)] text-3xl">Envíos y plazos</h1>
      <p className="mt-4 text-[#5c564c] leading-relaxed">{SHIPPING_POLICY.summary}</p>

      <h2 className="mt-10 font-[family-name:var(--font-display)] text-2xl text-[#1c1915]">
        {SHIPPING_POLICY.title}
      </h2>
      <ul className="mt-4 list-disc space-y-2 pl-5 text-sm leading-6 text-[#4d473e]">
        {SHIPPING_POLICY.bullets.map((b) => (
          <li key={b.slice(0, 40)}>{b}</li>
        ))}
      </ul>

      <h2 className="mt-10 font-[family-name:var(--font-display)] text-2xl text-[#1c1915]">
        Tarifas Correos (España)
      </h2>
      <p className="mt-3 text-sm text-[#5c564c]">
        El código postal marca la zona. Polar cobra producto + envío en un solo pago (tarjeta,
        Apple Pay o Bizum).
      </p>
      <ul className="mt-6 space-y-3 text-sm">
        <li className="flex justify-between rounded-2xl border border-[#e6ddd0] bg-white px-4 py-3">
          <span>{ZONE_LABEL.peninsula}</span>
          <span>{euros(s.peninsula)}</span>
        </li>
        <li className="flex justify-between rounded-2xl border border-[#e6ddd0] bg-white px-4 py-3">
          <span>{ZONE_LABEL.baleares}</span>
          <span>{euros(s.baleares)}</span>
        </li>
        <li className="flex justify-between rounded-2xl border border-[#e6ddd0] bg-white px-4 py-3">
          <span>{ZONE_LABEL.canarias}</span>
          <span>{euros(s.canarias)}</span>
        </li>
        <li className="flex justify-between rounded-2xl border border-[#e6ddd0] bg-white px-4 py-3">
          <span>{ZONE_LABEL.ceuta_melilla}</span>
          <span>{euros(s.ceuta_melilla)}</span>
        </li>
      </ul>
      <p className="mt-6 text-sm text-[#7a7266]">
        Península gratis a partir de{" "}
        {euros(s.freePeninsulaFrom || DEFAULT_SHIPPING.freePeninsulaFrom)} de producto. Ahorro por
        unidades extra: {euros(packSaving("generica", 2))} en la segunda Google / WhatsApp /
        Instagram y {euros(packSaving("personalizada", 2))} con logo. Primera genérica{" "}
        {euros(PRICE.generica.first)} · con logo {euros(PRICE.personalizada.first)} · TAP Wi‑Fi{" "}
        {euros(PRICE.wifi.first)} (2 genéricas = {euros(productPrice("generica", 2))}, no{" "}
        {euros(packWas("generica", 2))}).
      </p>

      <p className="mt-8 text-sm text-[#5c564c]">
        Condiciones generales:{" "}
        <Link href="/legal" className="underline underline-offset-2 hover:text-[#1c1915]">
          Aviso legal
        </Link>
        . Dudas:{" "}
        <a href={`mailto:${BRAND.email}`} className="underline underline-offset-2">
          {BRAND.email}
        </a>
        .
      </p>
    </div>
  );
}
