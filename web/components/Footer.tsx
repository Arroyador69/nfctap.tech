"use client";

import { SocialLinks } from "@/components/SocialLinks";
import { BRAND } from "@/lib/catalog";
import Link from "next/link";
import { usePathname } from "next/navigation";

export function Footer() {
  const path = usePathname();
  if (path.startsWith("/dashboard") || path === "/w" || path.startsWith("/w/")) return null;
  const shopBar = path.startsWith("/personalizar");

  return (
    <footer
      className={`mt-auto border-t border-[#e6ddd0] px-5 py-10 text-sm text-[#7a7266] ${
        shopBar ? "pb-28 lg:pb-10" : ""
      }`}
    >
      <div className="mx-auto flex max-w-6xl flex-col gap-8 sm:flex-row sm:items-start sm:justify-between">
        <p>
          © {new Date().getFullYear()} {BRAND.name}. Taller en España. NFC a tu enlace.
        </p>
        <div className="flex flex-col gap-6 sm:items-end">
          <div className="flex flex-wrap gap-5 sm:justify-end">
            <Link href="/envios" className="hover:text-[#1c1915]">
              Envíos
            </Link>
            <Link href="/legal" className="hover:text-[#1c1915]">
              Legal y condiciones
            </Link>
            <a href={`mailto:${BRAND.email}`} className="hover:text-[#1c1915]">
              {BRAND.email}
            </a>
          </div>
          <SocialLinks align="end" />
        </div>
      </div>
    </footer>
  );
}
