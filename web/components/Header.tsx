import { BRAND } from "@/lib/catalog";
import Link from "next/link";

export function Header() {
  return (
    <header className="sticky top-0 z-40 border-b border-[#e6ddd0] bg-[#f6f1e8]/85 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-5">
        <Link href="/" className="flex items-center gap-2 font-medium tracking-tight">
          <span className="grid h-8 w-8 place-items-center rounded-lg bg-[#1c1915] text-sm text-[#f6f1e7]">
            N
          </span>
          <span>
            {BRAND.name}
            <span className="text-[#b0892c]">.tech</span>
          </span>
        </Link>
        <nav className="flex items-center gap-5 text-sm text-[#5c564c]">
          <Link href="/#precios" className="hover:text-[#1c1915]">
            Precios
          </Link>
          <Link
            href="/personalizar"
            className="rounded-full bg-[#1c1915] px-4 py-2 font-medium text-[#f6f1e7]"
          >
            Crear tarjeta
          </Link>
        </nav>
      </div>
    </header>
  );
}
