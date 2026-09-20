"use client";

import { cartCount, loadCart, subscribeCart } from "@/lib/cart";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSyncExternalStore } from "react";

function snapshot() {
  return cartCount(loadCart());
}

function serverSnapshot() {
  return 0;
}

export function CartButton() {
  const path = usePathname();
  const n = useSyncExternalStore(subscribeCart, snapshot, serverSnapshot);
  if (path.startsWith("/dashboard")) return null;
  return (
    <Link
      href="/carrito"
      className={`relative hover:text-[#1c1915] ${path.startsWith("/carrito") ? "font-semibold text-[#1c1915]" : ""}`}
    >
      Carrito
      {n > 0 ? (
        <span className="ml-1 inline-flex min-w-5 items-center justify-center rounded-full bg-[#1c1915] px-1.5 text-[11px] font-semibold text-[#f6f1e7]">
          {n}
        </span>
      ) : null}
    </Link>
  );
}
