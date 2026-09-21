import type { Metadata } from "next";
import { BRAND, PRICE, SOCIALS } from "./catalog";

export const SITE = "https://nfctap.tech";
export const SITE_UPDATED = new Date("2026-09-22");

export function pageMeta(input: {
  title: string;
  description: string;
  path: string;
  image?: { url: string; width: number; height: number; alt: string };
  index?: boolean;
  absoluteTitle?: boolean;
}): Metadata {
  const url = input.path === "/" ? SITE : `${SITE}${input.path}`;
  const index = input.index !== false;
  const ogTitle = input.absoluteTitle ? input.title : `${input.title} · NFCTap`;
  return {
    title: input.absoluteTitle ? { absolute: input.title } : input.title,
    description: input.description,
    alternates: { canonical: url },
    robots: index
      ? { index: true, follow: true }
      : { index: false, follow: false, nocache: true },
    openGraph: {
      title: ogTitle,
      description: input.description,
      url,
      locale: "es_ES",
      siteName: "NFCTap",
      type: "website",
      images: input.image
        ? [input.image]
        : [{ url: "/og.png", width: 1200, height: 630, alt: "NFCTap" }],
    },
    twitter: {
      card: "summary_large_image",
      title: ogTitle,
      description: input.description,
      images: [input.image?.url || "/og.png"],
    },
  };
}

export type FaqItem = { q: string; a: string };

export const HOME_FAQ: FaqItem[] = [
  {
    q: "¿Qué es un atril NFCTap?",
    a: "Es un atril NFC impreso en España. El cliente acerca el móvil y se abre WhatsApp, Instagram o la reseña de Google. Sin app y sin QR sucio.",
  },
  {
    q: "¿Hace falta instalar una aplicación?",
    a: "No. El chip lleva tu enlace. En Android y en iPhone el toque abre la ficha, el chat o el perfil.",
  },
  {
    q: "¿Cuánto cuesta y cuánto tarda el envío?",
    a: `La primera de barra ${PRICE.generica.first} €, cada una más ${PRICE.generica.extra} €. Con logo ${PRICE.personalizada.first} €. TAP Wi‑Fi de pared ${PRICE.wifi.first} €. Sale con Correos en 24 h, solo España.`,
  },
  {
    q: "¿El TAP Wi‑Fi de pared es lo mismo que el atril?",
    a: "No. El atril va en la barra. El TAP Wi‑Fi se pega a la pared: el huésped acerca el móvil y se conecta a la red. Diseño fijo, adhesivo incluido.",
  },
];

export function organizationJsonLd() {
  return {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Organization",
        "@id": `${SITE}/#org`,
        name: BRAND.name,
        url: SITE,
        email: BRAND.email,
        logo: `${SITE}/og.png`,
        sameAs: SOCIALS.map((s) => s.href),
        areaServed: { "@type": "Country", name: "Spain" },
      },
      {
        "@type": "WebSite",
        "@id": `${SITE}/#site`,
        url: SITE,
        name: BRAND.name,
        inLanguage: "es-ES",
        publisher: { "@id": `${SITE}/#org` },
      },
    ],
  };
}

export function faqJsonLd(items: FaqItem[]) {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: items.map((item) => ({
      "@type": "Question",
      name: item.q,
      acceptedAnswer: { "@type": "Answer", text: item.a },
    })),
  };
}

export function productListJsonLd() {
  return {
    "@context": "https://schema.org",
    "@type": "ItemList",
    itemListElement: [
      {
        "@type": "ListItem",
        position: 1,
        item: {
          "@type": "Product",
          name: "Atril NFC Google, WhatsApp o Instagram",
          description: "Atril NFC de barra. Un toque abre reseña, chat o perfil.",
          brand: { "@type": "Brand", name: BRAND.name },
          offers: {
            "@type": "Offer",
            priceCurrency: "EUR",
            price: String(PRICE.generica.first),
            availability: "https://schema.org/InStock",
            url: `${SITE}/personalizar`,
          },
        },
      },
      {
        "@type": "ListItem",
        position: 2,
        item: {
          "@type": "Product",
          name: "Atril NFC con logo",
          description: "El mismo atril, con la marca del negocio en relieve.",
          brand: { "@type": "Brand", name: BRAND.name },
          offers: {
            "@type": "Offer",
            priceCurrency: "EUR",
            price: String(PRICE.personalizada.first),
            availability: "https://schema.org/InStock",
            url: `${SITE}/personalizar?kind=personalizada`,
          },
        },
      },
      {
        "@type": "ListItem",
        position: 3,
        item: {
          "@type": "Product",
          name: "TAP Wi‑Fi de pared",
          description: "Placa NFC de pared: acerca el móvil y se conecta al Wi‑Fi.",
          brand: { "@type": "Brand", name: BRAND.name },
          offers: {
            "@type": "Offer",
            priceCurrency: "EUR",
            price: String(PRICE.wifi.first),
            availability: "https://schema.org/InStock",
            url: `${SITE}/wifi`,
          },
        },
      },
    ],
  };
}

export function productJsonLd(input: {
  name: string;
  description: string;
  price: number;
  path: string;
  image?: string;
}) {
  return {
    "@context": "https://schema.org",
    "@type": "Product",
    name: input.name,
    description: input.description,
    brand: { "@type": "Brand", name: BRAND.name },
    image: input.image ? `${SITE}${input.image}` : `${SITE}/og.png`,
    offers: {
      "@type": "Offer",
      priceCurrency: "EUR",
      price: String(input.price),
      availability: "https://schema.org/InStock",
      url: `${SITE}${input.path}`,
    },
  };
}

export function articleJsonLd(input: {
  title: string;
  description: string;
  path: string;
  datePublished: string;
  faq: FaqItem[];
}) {
  const url = `${SITE}${input.path}`;
  return {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Article",
        headline: input.title,
        description: input.description,
        inLanguage: "es-ES",
        datePublished: input.datePublished,
        dateModified: input.datePublished,
        mainEntityOfPage: url,
        author: { "@id": `${SITE}/#org` },
        publisher: { "@id": `${SITE}/#org` },
      },
      {
        "@type": "BreadcrumbList",
        itemListElement: [
          { "@type": "ListItem", position: 1, name: "Inicio", item: SITE },
          { "@type": "ListItem", position: 2, name: "Guía", item: `${SITE}/guia` },
          { "@type": "ListItem", position: 3, name: input.title, item: url },
        ],
      },
      faqJsonLd(input.faq),
    ],
  };
}
