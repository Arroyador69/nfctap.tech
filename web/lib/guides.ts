import { PRICE } from "./catalog";
import type { FaqItem } from "./seo";

export type GuideSection = { h2: string; body: string[] };

export type Guide = {
  slug: string;
  title: string;
  description: string;
  kicker: string;
  answer: string;
  datePublished: string;
  sections: GuideSection[];
  faq: FaqItem[];
  cta: { href: string; label: string };
};

export const GUIDES: Guide[] = [
  {
    slug: "atril-nfc-resenas-google",
    title: "Atril NFC para reseñas de Google: cómo pedirlo en la barra",
    description:
      "El cliente acerca el móvil al atril NFCTap y se abre tu ficha de reseña de Google. 20 €, impreso en España, envío en 24 h.",
    kicker: "Google · barra",
    answer:
      "Un atril NFC para reseñas de Google es una pieza de pie en la barra: el cliente acerca el móvil y se abre el enlace de opinar en Maps. NFCTap lo imprime en España, programa el chip con tu ficha y lo envía con Correos en 24 h. La primera cuesta 20 €.",
    datePublished: "2026-09-22",
    cta: { href: "/personalizar?models=google", label: "Encargar atril Google" },
    sections: [
      {
        h2: "Por qué Maps te esconde si no pides la reseña",
        body: [
          "Google ordena restaurantes y bares por reseñas recientes, no solo por la media. Si el de al lado pide la opinión en mesa y tú no, sales más abajo aunque el servicio sea mejor.",
          "El QR de la caja se ignora: está sucio, lejos o hay que enfocar. El gesto que funciona es uno, a palmo del móvil, cuando el plato aún está caliente.",
        ],
      },
      {
        h2: "Cómo funciona el atril NFCTap de Google",
        body: [
          "Al encargar pegas el enlace de tu ficha o de Maps. La web lo convierte al de escribir reseña. Grabamos ese URL en el chip NTAG.",
          "El cliente acerca el móvil. Se abre la pantalla de opinar. Sin app, sin cuenta extra, sin papel. Android e iPhone.",
          `Lo ves en 3D antes de pagar. Negro, blanco o rojo; relieve amarillo, oro, blanco, rojo o negro. ${PRICE.generica.first} € la primera, ${PRICE.generica.extra} € cada una más.`,
        ],
      },
      {
        h2: "Dónde ponerlo",
        body: [
          "En la barra, a la vista, no de espaldas en el TPV. Si tienes terraza, un segundo atril cubre a quien no se acerca a caja. Dos piezas son 35 €.",
          "El equipo no tiene que hacer el speech de Google. El atril pide solo, todo el turno.",
        ],
      },
    ],
    faq: [
      {
        q: "¿El atril NFC abre Google Maps o la reseña?",
        a: "Abre el enlace de escribir reseña que grabamos en el chip, el que pides al encargar. No una búsqueda genérica.",
      },
      {
        q: "¿Puedo mezclar Google con WhatsApp?",
        a: "Sí. En el mismo pedido eliges cantidades de cada modelo. Pack de dos, 35 €.",
      },
    ],
  },
  {
    slug: "nfc-o-qr-hosteleria",
    title: "NFC o QR en hostelería: por qué el toque gana al papel",
    description:
      "El QR de la caja se ensucia y nadie lo enfoca. Un atril NFC se toca: se abre WhatsApp, Instagram o Google. NFCTap, desde 20 €.",
    kicker: "NFC · QR",
    answer:
      "En hostelería el NFC gana al QR porque no hay que enfocar un papel. El cliente acerca el móvil al atril y entra. NFCTap es esa pieza de pie, impresa en España, desde 20 €, con envío en 24 h.",
    datePublished: "2026-09-22",
    cta: { href: "/personalizar", label: "Encargar atril NFC" },
    sections: [
      {
        h2: "Qué falla en el QR de la caja",
        body: [
          "Hay que apuntar, enfocar y esperar. A dos palmos, con gel, caña o sol, el código se borra. El camarero señala y nadie saca el móvil.",
          "Un folio o una servilleta dura un servicio. El imán de la nevera lo ve el equipo, no el cliente.",
        ],
      },
      {
        h2: "Qué hace el NFC en la barra",
        body: [
          "El chip va dentro del atril, no pegado al mostrador. TAP: se abre tu enlace. WhatsApp, Instagram o la reseña de Google, el que elijas al encargar.",
          "No es magia de Apple ni de Google: es un NTAG programado con tu URL. iPhone y Android lo leen sin instalar nada.",
        ],
      },
      {
        h2: "Cuándo sigue teniendo sentido un QR",
        body: [
          "En una carta digital de muchas páginas, a veces. Para pedir la reseña, el chat o el follow, el gesto de un segundo en la barra funciona mejor.",
          "NFCTap no sustituye tu TPV ni tu carta. Sustituye el papel sucio que nadie escanea.",
        ],
      },
    ],
    faq: [
      {
        q: "¿El iPhone lee el atril NFC?",
        a: "Sí. El toque abre el enlace. No hace falta app de NFCTap.",
      },
      {
        q: "¿El diseño se personaliza?",
        a: "La genérica lleva G, WhatsApp o Instagram. Con logo, 30 €, tu marca en relieve. El TAP Wi‑Fi de pared no se dibuja: es Wi‑Fi + TAP HERE.",
      },
    ],
  },
  {
    slug: "wifi-nfc-alquiler-hotel",
    title: "Wi‑Fi NFC para alquileres y hoteles: acerca el móvil y entra",
    description:
      "Placa NFC de pared NFCTap: el huésped acerca el móvil y se conecta al Wi‑Fi. 15 €, adhesivo incluido, impresa en España.",
    kicker: "Wi‑Fi · pared",
    answer:
      "Una placa NFC de Wi‑Fi para alquiler vacacional u hotel se pega a la pared. El huésped acerca el móvil: Android se une a la red; iPhone enseña el nombre y la clave. NFCTap la imprime en España a 15 €, con adhesivo, diseño fijo Wi‑Fi + TAP HERE.",
    datePublished: "2026-09-22",
    cta: { href: "/wifi", label: "Ver TAP Wi‑Fi en 3D" },
    sections: [
      {
        h2: "El papelito del cajón no escala",
        body: [
          "En un piso turístico la clave está en un folio, en el libro o en un WhatsApp que llega tarde. En hotel, cada recepción la dicta. Se pierde y se fotocopia mal.",
          "El TAP Wi‑Fi lleva la red en el chip. Lo pegas una vez. Cada huésped TAP.",
        ],
      },
      {
        h2: "Qué incluye NFCTap",
        body: [
          `Placa de pared, ${PRICE.wifi.first} €. Cuerpo negro, blanco o rojo; relieve a elegir. Adhesivo 3M. No se cambia el dibujo: Wi‑Fi y TAP HERE, para que se entienda sin idioma.`,
          "Al encargar nos das el SSID y la contraseña (mínimo 8 caracteres, o red abierta). Lo grabamos nosotros. Lo ves en 3D en la web.",
          "Android se une al tocar. iPhone muestra la red y la clave para copiar. Una landing muda en nfctap.tech/w solo se abre con el TAP: no lista redes ajenas.",
        ],
      },
      {
        h2: "Dónde pegarlo",
        body: [
          "Entrada, cabecero, zona de maletas o recepción. Una placa por vivienda o por planta. Si también quieres reseñas de Google o WhatsApp, el atril de barra va aparte y se paga junto en el carrito.",
        ],
      },
    ],
    faq: [
      {
        q: "¿Puedo poner mi logo en el TAP Wi‑Fi?",
        a: "No. El dibujo es fijo a propósito. Eliges colores de PLA. El logo va en el atril de barra (30 €).",
      },
      {
        q: "¿Sirve para el Wi‑Fi de invitados de un restaurante?",
        a: "Sí. Terraza, sala u oficina. Misma placa, misma red de invitados.",
      },
    ],
  },
  {
    slug: "atril-nfc-whatsapp-instagram",
    title: "WhatsApp e Instagram en la barra con un atril NFC",
    description:
      "Un toque abre el chat de WhatsApp o tu Instagram. Atril NFCTap 20 €, pack 35 €, impreso en España.",
    kicker: "WhatsApp · Instagram",
    answer:
      "Un atril NFC de WhatsApp abre el chat al acercar el móvil, sin dictar el número. El de Instagram abre tu perfil, sin buscar el nombre. NFCTap los imprime en España desde 20 €; las dos piezas, 35 €.",
    datePublished: "2026-09-22",
    cta: { href: "/personalizar", label: "Elegir WhatsApp o Instagram" },
    sections: [
      {
        h2: "WhatsApp: la reserva que no llega",
        body: [
          "Quieren mesa y no encuentran el nueve mil. El bio de Instagram no es un chat. El papel con el número se pierde.",
          "El atril de WhatsApp está en la barra. TAP: se abre wa.me con tu número. Lo pones al encargar, enlace o dígitos.",
        ],
      },
      {
        h2: "Instagram: comen rico y no te siguen",
        body: [
          "Hacen la foto del plato y publican en su cuenta, o te etiquetan mal. El QR del bio no se ve desde la mesa.",
          "El atril de Instagram abre tu perfil exacto. Un toque, tu cuenta, ni una letra mal.",
        ],
      },
      {
        h2: "Pack mixto",
        body: [
          "Google en barra y WhatsApp al lado. O Instagram y chat. No tienen que ser iguales. 20 € la primera, 15 € cada una más. Con tu logo, 30 € y 25 €.",
          "Lo mezclas en Encargar, lo metes en el carrito y pagas con Polar (tarjeta, Apple Pay o Bizum). Correos, 24 h, España.",
        ],
      },
    ],
    faq: [
      {
        q: "¿Hace falta que el cliente tenga WhatsApp Business?",
        a: "No. Se abre el chat con el número que grabamos. El suyo de siempre.",
      },
      {
        q: "¿Puedo poner el @ de Instagram sin pegar el enlace?",
        a: "Sí. Al encargar vale @cuenta o el URL del perfil.",
      },
    ],
  },
];

export function guideBySlug(slug: string) {
  return GUIDES.find((g) => g.slug === slug);
}
