import { Footer } from "@/components/Footer";
import { Header } from "@/components/Header";
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
  metadataBase: new URL("https://www.nfctap.tech"),
  title: {
    default: "NFCTap — Crea tu tarjeta NFC de reseñas Google",
    template: "%s · NFCTap",
  },
  description:
    "Editor 3D para tarjetas NFC verticales. El cliente toca y deja la reseña en Google. Desde 15 €. Impreso en España.",
  applicationName: "NFCTap",
  appleWebApp: {
    capable: true,
    title: "NFCTap",
    statusBarStyle: "default",
  },
  icons: {
    icon: "/icon.svg",
    apple: "/icon.svg",
  },
  alternates: {
    canonical: "https://www.nfctap.tech",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" className={`${outfit.variable} ${fraunces.variable} h-full antialiased`}>
      <body className="flex min-h-full flex-col font-[family-name:var(--font-outfit)] pb-[env(safe-area-inset-bottom)]">
        <Header />
        <main className="flex-1">{children}</main>
        <Footer />
      </body>
    </html>
  );
}
