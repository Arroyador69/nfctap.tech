import { BRAND } from "@/lib/catalog";
import Link from "next/link";

export function Header() {
  return (
    <header
      className="sticky top-0 z-40 border-b border-[#e6ddd0] bg-[#f6f1e8]/85 backdrop-blur-xl"
      style={{ paddingTop: "env(safe-area-inset-top)" }}
    >
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-5">
        <Link href="/" className="flex items-center gap-2 font-medium tracking-tight">
          <span className="grid h-8 w-8 place-items-center rounded-lg bg-[#1c1915] font-[family-name:var(--font-fraunces)] text-[17px] leading-none text-[#f6f1e7]">
            N
          </span>
          <span className="font-[family-name:var(--font-fraunces)]">
            {BRAND.name}
            <span className="text-[#b0892c]">.tech</span>
          </span>
        </Link>
        <nav className="flex items-center gap-3 text-sm text-[#5c564c] sm:gap-5">
          <Link href="/#precios" className="hover:text-[#1c1915]">
            Precios
          </Link>
          <Link
            href="/personalizar"
            className="rounded-full bg-[#1c1915] px-4 py-2 font-medium text-[#f6f1e7]"
          >
            Encargar
          </Link>
        </nav>
      </div>
    </header>
  );
}
