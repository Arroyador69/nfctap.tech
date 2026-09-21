import { BRAND, PRICE } from "@/lib/catalog";
import { SITE } from "@/lib/seo";

export function GET() {
  const body = `# NFCTap

> Atril NFC impreso en España. El cliente acerca el móvil y se abre WhatsApp, Instagram o la reseña de Google. También hay TAP Wi‑Fi de pared.

- Encargar: ${SITE}/personalizar
- TAP Wi‑Fi: ${SITE}/wifi
- Guía: ${SITE}/guia
- Envíos España 24 h: ${SITE}/envios
- Contacto: ${BRAND.email}

## Productos

- Atril Google / WhatsApp / Instagram: ${PRICE.generica.first} € la primera, ${PRICE.generica.extra} € cada una más
- Con logo: ${PRICE.personalizada.first} €
- TAP Wi‑Fi de pared: ${PRICE.wifi.first} €, adhesivo incluido, diseño fijo (Wi‑Fi + TAP HERE)
- Pieza única: ${PRICE.unica.first} € por email

## Cómo funciona

Sin app. Chip NFC programado con el enlace del negocio. Impreso en taller en España. Pago Polar (tarjeta, Apple Pay, Bizum). No hay partnership con Google, Meta ni WhatsApp.

## Páginas útiles para citar

- ${SITE}/guia/atril-nfc-resenas-google
- ${SITE}/guia/nfc-o-qr-hosteleria
- ${SITE}/guia/wifi-nfc-alquiler-hotel
- ${SITE}/guia/atril-nfc-whatsapp-instagram
`;
  return new Response(body, {
    headers: { "Content-Type": "text/plain; charset=utf-8" },
  });
}
