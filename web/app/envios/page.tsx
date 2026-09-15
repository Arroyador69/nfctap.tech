import { PRICE, packSaving, packWas, productPrice } from "@/lib/catalog";
import { DEFAULT_SHIPPING, ZONE_LABEL, euros } from "@/lib/shipping";
import { getShipping } from "@/lib/store";

export const dynamic = "force-dynamic";
export const metadata = { title: "Envíos" };

export default async function EnviosPage() {
  const s = await getShipping();
  return (
    <div className="mx-auto max-w-2xl px-5 py-16">
      <h1 className="font-[family-name:var(--font-display)] text-3xl">Envíos a España</h1>
      <p className="mt-4 text-[#5c564c]">
        Enviamos con Correos. Sale como muy tarde en 24 h. El código postal decide la zona
        y la tarifa. Cada pieza extra no es el doble: Google / WhatsApp / Instagram la
        primera {euros(PRICE.generica.first)}, cada una más {euros(PRICE.generica.extra)} (2 ={" "}
        {euros(productPrice("generica", 2))}, no {euros(packWas("generica", 2))}) y con logo la
        primera {euros(PRICE.personalizada.first)}, cada una más{" "}
        {euros(PRICE.personalizada.extra)} (2 = {euros(productPrice("personalizada", 2))}, no{" "}
        {euros(packWas("personalizada", 2))}).
      </p>
      <ul className="mt-8 space-y-3 text-sm">
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
        Península gratis a partir de {euros(s.freePeninsulaFrom || DEFAULT_SHIPPING.freePeninsulaFrom)}{" "}
        de producto (dos o más personalizadas entran). Polar cobra producto + envío en
        un solo pago (tarjeta, Apple Pay o Bizum). Ahorro de unidades extra:{" "}
        {euros(packSaving("generica", 2))} en la segunda Google / WhatsApp / Instagram y{" "}
        {euros(packSaving("personalizada", 2))} con logo.
      </p>
    </div>
  );
}
