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
  if (path.startsWith("/dashboard") || n < 1) return null;
  return (
    <Link
      href="/carrito"
      aria-label={`Carrito, ${n} ${n === 1 ? "pieza" : "piezas"}`}
      className={`relative grid h-9 w-9 place-items-center rounded-full text-[#1c1915] hover:bg-[#f3eee4] ${
        path.startsWith("/carrito") ? "bg-[#f3eee4]" : ""
      }`}
    >
      <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" aria-hidden>
        <path
          d="M3.5 5.5h1.6l.4 1.5 1.4 7.2A2 2 0 0 0 8.86 16h8.28a2 2 0 0 0 2-1.6l1.1-5.5H7.2"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <circle cx="9.2" cy="19" r="1.35" fill="currentColor" />
        <circle cx="17.2" cy="19" r="1.35" fill="currentColor" />
      </svg>
      <span className="absolute -right-0.5 -top-0.5 grid h-4 min-w-4 place-items-center rounded-full bg-[#1c1915] px-1 text-[10px] font-semibold leading-none text-[#f6f1e7]">
        {n}
      </span>
    </Link>
  );
}
