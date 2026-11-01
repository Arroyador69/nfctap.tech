"use client";

import { readConsent } from "@/lib/cookie-consent";
import { usePathname } from "next/navigation";
import { useEffect } from "react";

export function VisitBeacon() {
  const pathname = usePathname();

  useEffect(() => {
    if (
      !pathname ||
      pathname.startsWith("/dashboard") ||
      pathname === "/w" ||
      pathname.startsWith("/w/") ||
      pathname.startsWith("/lista/") ||
      pathname.startsWith("/taller/") ||
      pathname.startsWith("/panel")
    ) {
      return;
    }
    if (!readConsent()?.analytics) return;

    const body = JSON.stringify({
      path: pathname,
      referrer: document.referrer,
      href: `${window.location.origin}${window.location.pathname}${window.location.search}`,
    });
    const blob = new Blob([body], { type: "application/json" });
    if (!navigator.sendBeacon("/api/visit", blob)) {
      fetch("/api/visit", {
        method: "POST",
        body,
        headers: { "Content-Type": "application/json" },
        keepalive: true,
      });
    }
  }, [pathname]);

  // Re-enviar al aceptar analítica (sin recargar)
  useEffect(() => {
    function onConsent() {
      if (!readConsent()?.analytics || !pathname) return;
      if (
        pathname.startsWith("/dashboard") ||
        pathname.startsWith("/panel") ||
        pathname.startsWith("/lista/") ||
        pathname.startsWith("/taller/")
      ) {
        return;
      }
      const body = JSON.stringify({
        path: pathname,
        referrer: document.referrer,
        href: window.location.href,
      });
      fetch("/api/visit", {
        method: "POST",
        body,
        headers: { "Content-Type": "application/json" },
        keepalive: true,
      });
    }
    window.addEventListener("nfctap-consent", onConsent);
    return () => window.removeEventListener("nfctap-consent", onConsent);
  }, [pathname]);

  return null;
}
