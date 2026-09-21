import { Designer } from "@/components/Designer";
import { JsonLd } from "@/components/JsonLd";
import { MetaViewContent } from "@/components/MetaPixel";
import { BRAND, PRICE } from "@/lib/catalog";
import { pageMeta, productJsonLd } from "@/lib/seo";
import { euros } from "@/lib/shipping";
import { getShipping } from "@/lib/store";
import Link from "next/link";

export const dynamic = "force-dynamic";

const WIFI_DESC =
  "Placa NFC de pared: el huésped acerca el móvil y se conecta al Wi‑Fi. Diseño fijo, adhesivo incluido. 15 €. Impreso en España.";

export const metadata = pageMeta({
  title: "TAP Wi‑Fi de pared",
  description: WIFI_DESC,
  path: "/wifi",
  image: { url: "/wifi-pared.jpg", width: 1080, height: 1440, alt: "TAP Wi‑Fi de pared NFCTap" },
});

export default async function WifiPage() {
  return (
    <div className="mx-auto max-w-6xl px-5 pb-6 pt-3 sm:py-10">
      <JsonLd
        data={productJsonLd({
          name: "TAP Wi‑Fi de pared",
          description: WIFI_DESC,
          price: PRICE.wifi.first,
          path: "/wifi",
          image: "/wifi-pared.jpg",
        })}
      />
      <MetaViewContent contentName="wifi" value={PRICE.wifi.first} />
      <p className="text-xs uppercase tracking-[0.22em] text-[#b0892c]">Otro producto NFC</p>
      <h1 className="mt-2 font-[family-name:var(--font-display)] text-[1.75rem] leading-tight sm:text-5xl">
        TAP Wi‑Fi de pared
      </h1>
      <p className="mt-3 max-w-2xl text-sm text-[#5c564c] sm:text-base">
        El diseño es este y no se edita: Wi‑Fi y TAP HERE. Lo pegas a la pared (adhesivo
        incluido). Tus clientes acercan el móvil y se conectan: la red y la clave van en el
        chip. {euros(PRICE.wifi.first)} cada una. Lo ves en 3D con los mismos colores de PLA.
      </p>
      <ul className="mt-5 grid gap-3 text-sm text-[#5c564c] sm:grid-cols-3">
        {[
          ["Alquileres vacacionales", "El huésped TAP y entra al Wi‑Fi. Sin papelito en el cajón."],
          ["Hoteles y restaurantes", "Recepción, sala o terraza. Una placa por zona."],
          ["Cualquier negocio", "Wi‑Fi de invitados en barra, oficina o tienda."],
        ].map(([t, d]) => (
          <li key={t} className="rounded-[22px] border border-[#e6ddd0] bg-white/70 p-4">
            <p className="font-semibold text-[#1c1915]">{t}</p>
            <p className="mt-1">{d}</p>
          </li>
        ))}
      </ul>
      <p className="mt-4 max-w-2xl text-sm text-[#8a8173]">
        Lo principal sigue siendo el atril de barra.{" "}
        <Link href="/personalizar" className="underline decoration-[#d9cfc0] underline-offset-2">
          Encargar atril
        </Link>
        . El TAP de pared es el complemento: Android se une al tocar; iPhone enseña red y
        clave. Contacto {BRAND.email}.{" "}
        <Link
          href="/guia/wifi-nfc-alquiler-hotel"
          className="underline decoration-[#d9cfc0] underline-offset-2"
        >
          Guía Wi‑Fi NFC
        </Link>
        .
      </p>
      <div className="mt-8">
        <Designer initialKind="wifi" shipping={await getShipping()} />
      </div>
    </div>
  );
}
