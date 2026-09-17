/** Fragmento del TAP. Nunca query string: eso acaba en logs del servidor. */

export type WifiTapCreds = { ssid: string; password: string; open: boolean };

function b64urlEncode(text: string) {
  const bytes = new TextEncoder().encode(text);
  let bin = "";
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function b64urlDecode(raw: string) {
  const pad = raw.length % 4 === 0 ? "" : "=".repeat(4 - (raw.length % 4));
  const b64 = raw.replace(/-/g, "+").replace(/_/g, "/") + pad;
  const bin = atob(b64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return new TextDecoder().decode(bytes);
}

function authOpen(t: string) {
  const v = t.toLowerCase();
  return v === "nopass" || v === "open";
}

function fromParams(src: string): WifiTapCreds | null {
  const p = new URLSearchParams(src);
  const ssid = (p.get("s") || "").trim();
  if (!ssid) return null;
  return { ssid, password: p.get("p") || "", open: authOpen(p.get("t") || "WPA") };
}

/** Solo el hash (#…). Ignora ?query a propósito. */
export function parseWifiFragment(hash: string): WifiTapCreds | null {
  const raw = hash.replace(/^#/, "").trim();
  if (!raw) return null;
  if (raw.includes("=") && /(^|&)s=/.test(raw)) return fromParams(raw);
  try {
    const j = JSON.parse(b64urlDecode(raw)) as { s?: string; p?: string; t?: string };
    const ssid = (j.s || "").trim();
    if (!ssid) return null;
    return { ssid, password: j.p || "", open: authOpen(j.t || "WPA") };
  } catch {
    return null;
  }
}

export function encodeWifiFragment(ssid: string, password: string, open: boolean) {
  return b64urlEncode(JSON.stringify({ s: ssid, p: open ? "" : password, t: open ? "nopass" : "WPA" }));
}
