import { BRAND } from "@/lib/catalog";
import { pageMeta } from "@/lib/seo";
import Link from "next/link";

export const metadata = pageMeta({
  title: "Política de privacidad",
  description:
    "Política de privacidad RGPD de NFCTap (nfctap.tech). Tratamiento de datos de pedidos y contacto en España.",
  path: "/privacidad",
});

export default function PrivacidadPage() {
  return (
    <div className="mx-auto max-w-2xl px-5 py-16 text-sm leading-7 text-[#4d473e]">
      <h1 className="font-[family-name:var(--font-display)] text-3xl text-[#1c1915]">
        Política de privacidad
      </h1>
      <p className="mt-2 text-xs text-[#8a8173]">Última actualización: 1 de noviembre de 2026</p>

      <h2 className="mt-10 font-[family-name:var(--font-display)] text-2xl text-[#1c1915]">
        1. Responsable
      </h2>
      <p className="mt-3">
        El responsable del tratamiento es el titular de la marca {BRAND.name} (
        <a href={BRAND.url} className="underline underline-offset-2">
          {BRAND.domain}
        </a>
        ), con domicilio de actividad en España. Contacto de privacidad:{" "}
        <a href={`mailto:${BRAND.email}`} className="underline underline-offset-2">
          {BRAND.email}
        </a>
        .
      </p>

      <h2 className="mt-10 font-[family-name:var(--font-display)] text-2xl text-[#1c1915]">
        2. Datos que tratamos
      </h2>
      <ul className="mt-3 list-disc space-y-1 pl-5">
        <li>
          Pedidos: nombre, email, teléfono, dirección de envío, contenido del pedido (modelo,
          logo, enlaces NFC o credenciales Wi‑Fi que indiques para grabar el chip).
        </li>
        <li>Comunicaciones: email y contenido si nos escribes.</li>
        <li>
          Navegación (si consientes): datos técnicos de visita y, en su caso, identificadores de
          Meta Pixel. Ver{" "}
          <Link href="/cookies" className="underline underline-offset-2">
            Política de cookies
          </Link>
          .
        </li>
        <li>
          Prospección B2B: emails de contacto públicos de negocios, con baja en un clic (
          <Link href="/legal" className="underline underline-offset-2">
            condiciones
          </Link>
          ).
        </li>
      </ul>

      <h2 className="mt-10 font-[family-name:var(--font-display)] text-2xl text-[#1c1915]">
        3. Finalidades y bases legales
      </h2>
      <ul className="mt-3 list-disc space-y-2 pl-5">
        <li>
          <strong>Ejecución del contrato</strong> (art. 6.1.b RGPD): fabricar, cobrar (vía Polar),
          enviar y atender el pedido.
        </li>
        <li>
          <strong>Obligación legal</strong> (art. 6.1.c): facturación y plazos fiscales.
        </li>
        <li>
          <strong>Interés legítimo</strong> (art. 6.1.f): seguridad de la web, prevención de fraude,
          prospección B2B con datos públicos y derecho de oposición / baja.
        </li>
        <li>
          <strong>Consentimiento</strong> (art. 6.1.a): cookies de analítica y marketing no
          esenciales.
        </li>
      </ul>

      <h2 className="mt-10 font-[family-name:var(--font-display)] text-2xl text-[#1c1915]">
        4. Encargados y cesiones
      </h2>
      <p className="mt-3">
        No vendemos tus datos. Pueden tratarlos, como encargados o responsables autónomos según el
        caso: Polar (pago), Vercel (alojamiento), Vercel Blob (almacenamiento de pedidos), Correos
        (transporte), Resend (email transaccional u outreach B2B) y, si aceptas marketing, Meta
        Platforms Ireland. Tratamientos sujetos a RGPD / adecuación UE.
      </p>

      <h2 className="mt-10 font-[family-name:var(--font-display)] text-2xl text-[#1c1915]">
        5. Conservación
      </h2>
      <p className="mt-3">
        Pedidos y facturación: plazos legales aplicables en España. Consultas: el tiempo necesario
        para responder. Consentimiento de cookies: hasta que lo retires o borres el almacenamiento
        local. Listas de baja de outreach: se conservan para no volver a contactarte.
      </p>

      <h2 className="mt-10 font-[family-name:var(--font-display)] text-2xl text-[#1c1915]">
        6. Derechos
      </h2>
      <p className="mt-3">
        Puedes solicitar acceso, rectificación, supresión, limitación, portabilidad y oposición
        escribiendo a {BRAND.email}. También puedes reclamar ante la Agencia Española de Protección
        de Datos (
        <a
          href="https://www.aepd.es"
          className="underline underline-offset-2"
          target="_blank"
          rel="noopener noreferrer"
        >
          aepd.es
        </a>
        ). Jurisdicción: tribunales españoles; sede habitual de la actividad en España (área de
        Madrid / España).
      </p>

      <h2 className="mt-10 font-[family-name:var(--font-display)] text-2xl text-[#1c1915]">
        7. Menores
      </h2>
      <p className="mt-3">
        El servicio B2B / compra online no está dirigido a menores de 14 años. No recopilamos datos
        de menores de forma consciente.
      </p>

      <p className="mt-10 text-xs text-[#8a8173]">
        Ver también{" "}
        <Link href="/legal" className="underline">
          Aviso legal
        </Link>
        ,{" "}
        <Link href="/cookies" className="underline">
          Cookies
        </Link>{" "}
        y{" "}
        <Link href="/envios" className="underline">
          Envíos
        </Link>
        .
      </p>
    </div>
  );
}
