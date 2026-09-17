"use client";

import { META_PIXEL_ID, trackMeta } from "@/lib/meta-pixel";
import { usePathname } from "next/navigation";
import Script from "next/script";
import { useEffect, useRef } from "react";

export function MetaPixel() {
  const pathname = usePathname();
  const first = useRef(true);

  useEffect(() => {
    if (!pathname || pathname.startsWith("/dashboard") || pathname === "/w" || pathname.startsWith("/w/")) {
      return;
    }
    if (first.current) {
      first.current = false;
      return;
    }
    trackMeta("PageView");
  }, [pathname]);

  if (!META_PIXEL_ID || pathname?.startsWith("/dashboard") || pathname === "/w" || pathname?.startsWith("/w/")) {
    return null;
  }

  return (
    <>
      <Script id="meta-pixel" strategy="afterInteractive">{`
        !function(f,b,e,v,n,t,s)
        {if(f.fbq)return;n=f.fbq=function(){n.callMethod?
        n.callMethod.apply(n,arguments):n.queue.push(arguments)};
        if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
        n.queue=[];t=b.createElement(e);t.async=!0;
        t.src=v;s=b.getElementsByTagName(e)[0];
        s.parentNode.insertBefore(t,s)}(window, document,'script',
        'https://connect.facebook.net/en_US/fbevents.js');
        fbq('init', '${META_PIXEL_ID}');
        fbq('track', 'PageView');
      `}</Script>
      <noscript>
        <img
          height={1}
          width={1}
          alt=""
          style={{ display: "none" }}
          src={`https://www.facebook.com/tr?id=${META_PIXEL_ID}&ev=PageView&noscript=1`}
        />
      </noscript>
    </>
  );
}

export function MetaViewContent({
  contentName,
  value,
}: {
  contentName: string;
  value: number;
}) {
  useEffect(() => {
    trackMeta("ViewContent", {
      value,
      currency: "EUR",
      content_name: contentName,
      content_type: "product",
    });
  }, [contentName, value]);
  return null;
}

export function MetaPurchase({
  orderId,
  value,
  qty,
  kind,
}: {
  orderId: string;
  value: number;
  qty: number;
  kind: string;
}) {
  useEffect(() => {
    const key = `meta_purchase_${orderId}`;
    if (sessionStorage.getItem(key)) return;
    sessionStorage.setItem(key, "1");
    trackMeta(
      "Purchase",
      {
        value,
        currency: "EUR",
        content_type: "product",
        content_name: kind,
        content_ids: [kind],
        num_items: qty,
        order_id: orderId,
      },
      orderId,
    );
  }, [orderId, value, qty, kind]);
  return null;
}
