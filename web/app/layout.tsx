import { Footer } from "@/components/Footer";
import { Header } from "@/components/Header";
import { MetaPixel } from "@/components/MetaPixel";
import { BRAND, SOCIALS } from "@/lib/catalog";
import type { Metadata, Viewport } from "next";
import { Fraunces, Outfit } from "next/font/google";
import "./globals.css";

const outfit = Outfit({
  variable: "--font-outfit",
  subsets: ["latin"],
});

const fraunces = Fraunces({
  variable: "--font-fraunces",
  subsets: ["latin"],
});

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  viewportFit: "cover",
  themeColor: "#f6f1e8",
};

export const metadata: Metadata = {
  metadataBase: new URL("https://nfctap.tech"),
  title: {
    default: "NFCTap — Atril NFC para WhatsApp, Instagram o Google",
    template: "%s · NFCTap",
  },
  description:
    "Atril NFC impreso en España. WhatsApp, Instagram o Google. Lo ves en 3D y lo encargas. Desde 20 €. Envío en 24 h. Pago con tarjeta, Apple Pay o Bizum.",
  applicationName: "NFCTap",
  openGraph: {
    type: "website",
    locale: "es_ES",
    url: "https://nfctap.tech",
    siteName: "NFCTap",
    title: "NFCTap — TAP. WhatsApp, Instagram o Google.",
    description:
      "Atril NFC. Lo ves en 3D y lo encargas. Desde 20 €. Envío en 24 h. Impreso en España.",
    images: [{ url: "/og.png", width: 1200, height: 630, alt: "NFCTap" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "NFCTap — TAP. WhatsApp, Instagram o Google.",
    description:
      "Atril NFC. Desde 20 €. Envío en 24 h. Impreso en España.",
    images: ["/og.png"],
  },
  appleWebApp: {
    capable: true,
    title: "NFCTap",
    statusBarStyle: "default",
  },
  icons: {
    icon: [{ url: "/icon.svg?v=3", type: "image/svg+xml" }],
    apple: "/icon.svg?v=3",
  },
  alternates: {
    canonical: "https://nfctap.tech",
  },
};

const jsonLd = {
  "@context": "https://schema.org",
  "@type": "Organization",
  name: BRAND.name,
  url: BRAND.url,
  email: BRAND.email,
  logo: "https://nfctap.tech/icon.svg",
  sameAs: SOCIALS.map((s) => s.href),
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" className={`${outfit.variable} ${fraunces.variable} h-full antialiased`}>
      <body className="flex min-h-full flex-col font-[family-name:var(--font-outfit)] pb-[env(safe-area-inset-bottom)]">
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
        <MetaPixel />
        <Header />
        <main className="flex-1">{children}</main>
        <Footer />
      </body>
    </html>
  );
}
