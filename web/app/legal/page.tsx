import { BRAND } from "@/lib/catalog";

export const metadata = { title: "Aviso legal" };

export default function LegalPage() {
  return (
    <div className="mx-auto max-w-2xl px-5 py-16 text-sm leading-7 text-[#4d473e]">
      <h1 className="font-[family-name:var(--font-display)] text-3xl text-[#1c1915]">
        Aviso legal y privacidad
      </h1>
      <p className="mt-6">
        {BRAND.name} ({BRAND.domain}) vende tarjetas NFC físicas para que el cliente de un
        negocio deje una reseña en Google. Los pedidos recogen nombre, email, teléfono,
        dirección y el diseño de la tarjeta para fabricar y enviar el pedido.
      </p>
      <p className="mt-4">
        No publica el logotipo oficial de Google. El NFC se programa con el enlace de
        reseña que facilita el comprador. El pago con Polar se activará en una fase
        posterior.
      </p>
      <p className="mt-4">Contacto: {BRAND.email}</p>
    </div>
  );
}
