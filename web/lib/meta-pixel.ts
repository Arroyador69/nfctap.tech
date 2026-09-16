/** Pixel de Meta Ads (dataset NFCTap.Tech). El ID no es secreto. */
export const META_PIXEL_ID =
  process.env.NEXT_PUBLIC_META_PIXEL_ID?.trim() || "2498883970623744";

export type MetaEvent =
  | "PageView"
  | "ViewContent"
  | "InitiateCheckout"
  | "Purchase";

export type MetaParams = {
  value?: number;
  currency?: "EUR";
  content_name?: string;
  content_type?: string;
  content_ids?: string[];
  num_items?: number;
  order_id?: string;
};

declare global {
  interface Window {
    fbq?: ((...args: unknown[]) => void) & { queue?: unknown[] };
  }
}

export function trackMeta(event: MetaEvent, params?: MetaParams, eventId?: string) {
  if (typeof window === "undefined" || !window.fbq) return;
  if (eventId) window.fbq("track", event, params || {}, { eventID: eventId });
  else window.fbq("track", event, params || {});
}

export function metaClickIds() {
  if (typeof document === "undefined") return {};
  const read = (name: string) => {
    const m = document.cookie.match(new RegExp(`(?:^|; )${name}=([^;]*)`));
    return m ? decodeURIComponent(m[1]) : undefined;
  };
  return { fbp: read("_fbp"), fbc: read("_fbc") };
}
