/** Wi‑Fi Simple Config (WSC) para NDEF. Android une la red al tocar. */

function be16(n: number) {
  return [(n >> 8) & 0xff, n & 0xff];
}

function tlv(type: number, value: number[]) {
  return [...be16(type), ...be16(value.length), ...value];
}

function utf8(s: string) {
  return Array.from(new TextEncoder().encode(s));
}

export type WifiAuth = "wpa2" | "wpa" | "open";

export function wifiQrLine(ssid: string, password: string, auth: WifiAuth) {
  const t = auth === "open" ? "nopass" : "WPA";
  const esc = (v: string) => v.replace(/([\\;,:"])/g, "\\$1");
  return `WIFI:T:${t};S:${esc(ssid)};${auth === "open" ? "" : `P:${esc(password)};`};`;
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
