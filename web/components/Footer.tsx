"use client";

import { SocialLinks } from "@/components/SocialLinks";
import { BRAND } from "@/lib/catalog";
import Link from "next/link";
import { usePathname } from "next/navigation";

export function Footer() {
  const path = usePathname();
  if (
    path.startsWith("/dashboard") ||
    path === "/w" ||
    path.startsWith("/w/") ||
    path.startsWith("/lista/") ||
    path.startsWith("/taller/") ||
    path.startsWith("/panel")
  )
    return null;
  const shopBar =
    path.startsWith("/personalizar") ||
    path.startsWith("/wifi") ||
    path.startsWith("/carrito") ||
    path.startsWith("/guia/") ||
    path.startsWith("/negocio");

  return (
    <footer
      className={`mt-auto border-t border-[#e6ddd0] px-5 py-10 text-sm text-[#7a7266] ${
        shopBar ? "pb-28 lg:pb-10" : ""
      }`}
    >
      <div className="mx-auto flex max-w-6xl flex-col gap-8 lg:flex-row lg:items-start lg:justify-between">
        <div className="max-w-md">
          <p>
            © {new Date().getFullYear()} {BRAND.name}. Taller en España. NFC a tu enlace.
          </p>
          <p className="mt-2 text-xs leading-5 text-[#8a8173]">
            Fabricación habitual ~72 h laborables · envío el día laborable siguiente · en picos
            hasta 15 días. Detalle en Envíos.
          </p>
        </div>
        <div className="flex flex-col gap-6 lg:items-end">
          <nav
            aria-label="Legal y ayuda"
            className="flex flex-wrap gap-x-5 gap-y-2 lg:justify-end"
          >
            <Link href="/guia" className="hover:text-[#1c1915]">
              Guía
            </Link>
            <Link href="/envios" className="hover:text-[#1c1915]">
              Envíos y plazos
            </Link>
            <Link href="/legal" className="hover:text-[#1c1915]">
              Aviso legal
            </Link>
            <Link href="/privacidad" className="hover:text-[#1c1915]">
              Privacidad
            </Link>
            <Link href="/cookies" className="hover:text-[#1c1915]">
              Cookies
            </Link>
            <a href={`mailto:${BRAND.email}`} className="hover:text-[#1c1915]">
              {BRAND.email}
            </a>
          </nav>
          <SocialLinks align="end" />
        </div>
      </div>
    </footer>
  );
}
