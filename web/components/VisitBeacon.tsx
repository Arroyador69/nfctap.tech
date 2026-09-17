"use client";

import { usePathname } from "next/navigation";
import { useEffect } from "react";

export function VisitBeacon() {
  const pathname = usePathname();

  useEffect(() => {
    if (!pathname || pathname.startsWith("/dashboard")) return;
    const body = JSON.stringify({
      path: pathname,
      referrer: document.referrer,
      href: window.location.href,
    });
    const blob = new Blob([body], { type: "application/json" });
    if (!navigator.sendBeacon("/api/visit", blob)) {
      fetch("/api/visit", { method: "POST", body, headers: { "Content-Type": "application/json" }, keepalive: true });
    }
  }, [pathname]);

  return null;
}
