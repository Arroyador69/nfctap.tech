"use client";

import { BRAND } from "@/lib/catalog";
import Link from "next/link";
import { usePathname } from "next/navigation";

export function Footer() {
  const path = usePathname();
  if (path.startsWith("/personalizar") || path.startsWith("/dashboard/nuevo")) return null;

  return (
    <footer className="mt-auto border-t border-[#e6ddd0] px-5 py-10 text-sm text-[#7a7266]">
      <div className="mx-auto flex max-w-6xl flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <p>
          © {new Date().getFullYear()} {BRAND.name}. Taller en España. NFC a tu Google.
        </p>
        <div className="flex gap-5">
          <Link href="/envios" className="hover:text-[#1c1915]">
            Envíos
          </Link>
          <Link href="/legal" className="hover:text-[#1c1915]">
            Legal
          </Link>
          <Link href="/dashboard" className="hover:text-[#1c1915]">
            Dashboard
          </Link>
        </div>
      </div>
    </footer>
  );
}
