/** Wi‑Fi Simple Config (WSC) para NDEF. Android puede unirse al tocar. */

export const WIFI_LANDING = "https://nfctap.tech/w";

function be16(n: number) {
  return [(n >> 8) & 0xff, n & 0xff];
}

function tlv(type: number, value: number[]) {
  return [...be16(type), ...be16(value.length), ...value];
}

function utf8(s: string) {
  return Array.from(new TextEncoder().encode(s));
}

function utf8dec(bytes: number[]) {
  return new TextDecoder().decode(Uint8Array.from(bytes));
}

export type WifiAuth = "wpa2" | "wpa" | "open";

export type WifiCreds = {
  ssid: string;
  password: string;
  auth: WifiAuth;
};

export function wifiQrLine(ssid: string, password: string, auth: WifiAuth) {
  const t = auth === "open" ? "nopass" : "WPA";
  const esc = (v: string) => v.replace(/([\\;,:"])/g, "\\$1");
  return `WIFI:T:${t};S:${esc(ssid)};${auth === "open" ? "" : `P:${esc(password)};`};`;
}

function b64urlEncode(text: string) {
  const bytes = utf8(text);
  let bin = "";
  for (const b of bytes) bin += String.fromCharCode(b);
  const b64 = btoa(bin);
  return b64.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function b64urlDecode(raw: string) {
  const pad = raw.length % 4 === 0 ? "" : "=".repeat(4 - (raw.length % 4));
  const b64 = raw.replace(/-/g, "+").replace(/_/g, "/") + pad;
  const bin = atob(b64);
  return utf8dec(Array.from(bin, (c) => c.charCodeAt(0)));
}

/** URL que el iPhone sí abre al acercar (Apple no une Wi‑Fi por NFC). */
export function wifiLandingUrl(ssid: string, password: string, auth: WifiAuth) {
  const t = auth === "open" ? "nopass" : "WPA";
  const raw = JSON.stringify({ s: ssid, p: auth === "open" ? "" : password, t });
  return `${WIFI_LANDING}#${b64urlEncode(raw)}`;
}

export function parseWifiLanding(url: string): WifiCreds | null {
  try {
    const u = new URL(url);
    if (u.pathname !== "/w" && u.pathname !== "/w/") return null;
    const raw = u.hash.replace(/^#/, "").trim();
    if (!raw) return null;
    if (raw.includes("=") && /(^|&)s=/.test(raw)) {
      const p = new URLSearchParams(raw);
      const ssid = (p.get("s") || "").trim();
      if (!ssid) return null;
      const t = (p.get("t") || "WPA").toLowerCase();
      const auth: WifiAuth = t === "nopass" || t === "open" ? "open" : "wpa2";
      return { ssid, password: p.get("p") || "", auth };
    }
    const j = JSON.parse(b64urlDecode(raw)) as { s?: string; p?: string; t?: string };
    const ssid = (j.s || "").trim();
    if (!ssid) return null;
    const t = (j.t || "WPA").toLowerCase();
    const auth: WifiAuth = t === "nopass" || t === "open" ? "open" : "wpa2";
    return { ssid, password: j.p || "", auth };
  } catch {
    return null;
  }
}

export function parseWifiQrLine(text: string): WifiCreds | null {
  const m = text.trim().match(/^WIFI:(.*);;?\s*$/i);
  if (!m) return null;
  const fields: Record<string, string> = {};
  const re = /([TSPH]):((?:\\.|[^;])*)/gi;
  let hit: RegExpExecArray | null;
  while ((hit = re.exec(m[1]))) {
    fields[hit[1].toUpperCase()] = hit[2].replace(/\\([\\;,:"])/g, "$1");
  }
  const ssid = (fields.S || "").trim();
  if (!ssid) return null;
  const t = (fields.T || "WPA").toLowerCase();
  const auth: WifiAuth = t === "nopass" || t === "open" ? "open" : "wpa2";
  return { ssid, password: fields.P || "", auth };
}

function parseTlvs(bytes: number[]) {
  const out: { type: number; value: number[] }[] = [];
  let i = 0;
  while (i + 4 <= bytes.length) {
    const type = (bytes[i] << 8) | bytes[i + 1];
    const len = (bytes[i + 2] << 8) | bytes[i + 3];
    i += 4;
    if (len < 0 || i + len > bytes.length) break;
    out.push({ type, value: bytes.slice(i, i + len) });
    i += len;
  }
  return out;
}

export function decodeWifiWsc(bytes: number[]): WifiCreds | null {
  const top = parseTlvs(bytes);
  const cred = top.find((t) => t.type === 0x100e)?.value ?? bytes;
  const inner = parseTlvs(cred);
  const ssidB = inner.find((t) => t.type === 0x1045);
  if (!ssidB) return null;
  const keyB = inner.find((t) => t.type === 0x1027);
  const authB = inner.find((t) => t.type === 0x1003);
  const authNum = authB && authB.value.length >= 2 ? (authB.value[0] << 8) | authB.value[1] : 0x0020;
  const auth: WifiAuth = authNum === 0x0001 ? "open" : authNum === 0x0002 ? "wpa" : "wpa2";
  return { ssid: utf8dec(ssidB.value), password: keyB ? utf8dec(keyB.value) : "", auth };
}

export function formatWifiCreds(c: WifiCreds) {
  if (c.auth === "open" || !c.password) return `${c.ssid} · sin clave`;
  return `${c.ssid} · ${c.password}`;
}

export function encodeWifiWsc(ssid: string, password: string, auth: WifiAuth) {
  const authType = auth === "open" ? 0x0001 : auth === "wpa" ? 0x0002 : 0x0020;
  const encType = auth === "open" ? 0x0001 : 0x0008;
  const cred = [
    ...tlv(0x1003, be16(authType)),
    ...tlv(0x100f, be16(encType)),
    ...tlv(0x1045, utf8(ssid)),
    ...(auth === "open" ? [] : tlv(0x1027, utf8(password))),
    ...tlv(0x1020, [0xff, 0xff, 0xff, 0xff, 0xff, 0xff]),
  ];
  return tlv(0x100e, cred);
}
