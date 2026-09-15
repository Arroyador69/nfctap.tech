import { SocialLinks } from "@/components/SocialLinks";
import { BRAND, PRICE, packWas, productPrice } from "@/lib/catalog";
import { DEFAULT_SHIPPING } from "@/lib/shipping";
import { euros } from "@/lib/shipping";

export const metadata = { title: "Aviso legal y condiciones" };

export default function LegalPage() {
  return (
    <div className="mx-auto max-w-2xl px-5 py-16 text-sm leading-7 text-[#4d473e]">
      <h1 className="font-[family-name:var(--font-display)] text-3xl text-[#1c1915]">
        Aviso legal y condiciones de compra
      </h1>
      <p className="mt-6">
        {BRAND.name} ({BRAND.domain}) vende atriles NFC físicos para que el cliente de un
        negocio abra WhatsApp, Instagram o la reseña de Google. Los pedidos recogen nombre,
        email, teléfono, dirección, el modelo y el enlace para fabricar y enviar.
      </p>
      <p className="mt-4">
        No hay partnership con Google, Meta ni WhatsApp. El NFC se programa con el enlace
        que facilita el comprador.
      </p>

      <h2 className="mt-10 font-[family-name:var(--font-display)] text-2xl text-[#1c1915]">
        Precios
      </h2>
      <ul className="mt-3 list-disc space-y-1 pl-5">
        <li>
          Google, WhatsApp o Instagram: primera {euros(PRICE.generica.first)} · cada una más{" "}
          {euros(PRICE.generica.extra)} (2 = {euros(productPrice("generica", 2))}, no{" "}
          {euros(packWas("generica", 2))}). Mezcla modelos y cantidades en el mismo pedido.
        </li>
        <li>
          Con logo: primera {euros(PRICE.personalizada.first)} · cada una más{" "}
          {euros(PRICE.personalizada.extra)} (2 = {euros(productPrice("personalizada", 2))}, no{" "}
          {euros(packWas("personalizada", 2))}).
        </li>
        <li>
          Pieza única: {euros(PRICE.unica.first)}. Se encarga por email a {BRAND.email}, no
          desde el checkout.
        </li>
      </ul>
      <p className="mt-3">
        Eliges las cantidades en la web. Polar cobra exactamente ese importe más el envío.
        Los precios incluyen IVA.
      </p>

      <h2 className="mt-10 font-[family-name:var(--font-display)] text-2xl text-[#1c1915]">
        Envío y plazos
      </h2>
      <p className="mt-3">
        Solo España. Correos. Sale como muy tarde en 24 h. La tarifa la marca el código
        postal. Península gratis a partir de {euros(DEFAULT_SHIPPING.freePeninsulaFrom)} de
        producto.
      </p>

      <h2 className="mt-10 font-[family-name:var(--font-display)] text-2xl text-[#1c1915]">
        Pago
      </h2>
      <p className="mt-3">
        El pago lo gestiona Polar (tarjeta, Apple Pay y Bizum en España). Polar confirma el
        cobro y avisa a esta web. No se paga por Bizum al teléfono del taller: eso no deja
        el pedido marcado como pagado.
      </p>

      <h2 className="mt-10 font-[family-name:var(--font-display)] text-2xl text-[#1c1915]">
        Encargo a medida
      </h2>
      <p className="mt-3">
        Cada pieza se imprime y se programa con tu enlace (y tu logo, si la pides con
        marca). Una vez fabricada no hay devolución salvo defecto. Si hay un fallo de
        impresión o de NFC, escríbenos a {BRAND.email}.
      </p>

      <p className="mt-8">Contacto: {BRAND.email}</p>

      <h2 className="mt-10 font-[family-name:var(--font-display)] text-2xl text-[#1c1915]">
        Redes
      </h2>
      <p className="mt-3">
        NFCTap en Instagram, TikTok, YouTube y Facebook. El logo de cada red abre la cuenta.
      </p>
      <div className="mt-4">
        <SocialLinks heading={false} />
      </div>
    </div>
  );
}
