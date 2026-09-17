import Constants from "expo-constants";
import { Platform } from "react-native";
import { decodeWifiWsc, encodeWifiWsc, formatWifiCreds, parseWifiLanding, parseWifiQrLine } from "./wifi";

export function isExpoGo() {
  return Constants.appOwnership === "expo";
}

export function nfcMessage(e: unknown, fallback: string) {
  const m = e instanceof Error ? e.message : String(e ?? "");
  if (/expo go/i.test(m)) return m;
  if (/cancel|user|invalidate|session/i.test(m)) {
    return "Sesión NFC cancelada. Vuelve a pulsar y acerca la pegatina.";
  }
  if (/not support|unsupported/i.test(m)) return "Este dispositivo no tiene NFC.";
  if (/undefined is not a function/i.test(m)) {
    return "Fallo al preparar el Wi‑Fi. Cierra, abre de nuevo y graba otra vez.";
  }
  return m.trim() || fallback;
}

async function readyNfc() {
  if (isExpoGo()) {
    throw new Error("Expo Go no usa NFC. Abre NFC Tap Config instalada desde TestFlight.");
  }
  const mod = await import("react-native-nfc-manager");
  const NfcManager = mod.default;
  const ok = await NfcManager.isSupported();
  if (!ok) throw new Error("Este iPhone no tiene NFC.");
  await NfcManager.start();
  return mod;
}

async function stopNfc(NfcManager: { cancelTechnologyRequest: () => Promise<void> }) {
  try {
    await NfcManager.cancelTechnologyRequest();
  } catch {
    /* no session */
  }
}

export async function nfcSupported(): Promise<boolean> {
  if (isExpoGo()) return false;
  try {
    const { default: NfcManager } = await readyNfc();
    return Boolean(NfcManager);
  } catch {
    return false;
  }
}

export type WritePayload = {
  uri?: string;
  text?: string;
  vcard?: string;
  androidId?: string;
  wifi?: { ssid: string; password: string };
};

/** NDEF exige Array real. Uint8Array no tiene charCodeAt → "undefined is not a function". */
function ndefBytes(data: ArrayLike<number>): number[] {
  return Array.prototype.slice.call(data);
}

export async function writePayload(payload: WritePayload) {
  const { default: NfcManager, NfcTech, Ndef } = await readyNfc();
  const records = [];
  if (payload.uri) records.push(Ndef.uriRecord(payload.uri));
  if (payload.text) records.push(Ndef.textRecord(payload.text));
  if (payload.vcard) {
    records.push(Ndef.mimeMediaRecord("text/vcard", payload.vcard));
  }
  if (payload.wifi?.ssid) {
    try {
      records.push(
        Ndef.wifiSimpleRecord({
          ssid: payload.wifi.ssid,
          networkKey: payload.wifi.password || "",
        }),
      );
    } catch {
      records.push(
        Ndef.mimeMediaRecord(
          "application/vnd.wfa.wsc",
          ndefBytes(encodeWifiWsc(payload.wifi.ssid, payload.wifi.password, "wpa2")),
        ),
      );
    }
  }
  if (payload.androidId && Platform.OS === "android") {
    records.push(Ndef.androidApplicationRecord(payload.androidId));
  }
  if (!records.length) throw new Error("Nada que escribir. Completa el enlace o el texto.");

  await NfcManager.requestTechnology(NfcTech.Ndef);
  try {
    let bytes: number[] | undefined;
    try {
      bytes = Ndef.encodeMessage(records);
    } catch {
      if (!payload.uri) throw new Error("No se pudo preparar el mensaje NDEF");
      bytes = Ndef.encodeMessage([Ndef.uriRecord(payload.uri)]);
    }
    if (!bytes) throw new Error("No se pudo preparar el mensaje NDEF");
    await NfcManager.ndefHandler.writeNdefMessage(bytes);
  } finally {
    await stopNfc(NfcManager);
  }
}

export type ReadResult = {
  id?: string;
  writable?: boolean;
  records: { type: string; value: string }[];
};

export async function readTag(): Promise<ReadResult> {
  const { default: NfcManager, NfcTech, Ndef } = await readyNfc();
  await NfcManager.requestTechnology(NfcTech.Ndef);
  try {
    const tag = await NfcManager.getTag();
    const records = (tag?.ndefMessage ?? []).map((rec) => {
      const type = Array.isArray(rec.type)
        ? String.fromCharCode(...rec.type)
        : String(rec.type ?? "");
      const payload = rec.payload ?? [];
      try {
        if (type === "U") {
          const value = Ndef.uri.decodePayload(payload);
          const wifi = parseWifiLanding(value);
          if (wifi) return { type: "Wi‑Fi", value: formatWifiCreds(wifi) };
          return { type: "URL", value };
        }
        if (type === "T") {
          const value = Ndef.text.decodePayload(payload);
          const wifi = parseWifiQrLine(value);
          if (wifi) return { type: "Wi‑Fi", value: formatWifiCreds(wifi) };
          return { type: "Texto", value };
        }
        if (/wfa\.wsc/i.test(type) || type === "application/vnd.wfa.wsc") {
          const wifi = decodeWifiWsc(payload);
          if (wifi) return { type: "Wi‑Fi Android", value: formatWifiCreds(wifi) };
        }
      } catch {
        /* raw */
      }
      return { type: type || "dato", value: String.fromCharCode(...payload.filter((b) => b >= 32)) };
    });
    return { id: tag?.id, writable: tag?.isWritable, records };
  } finally {
    await stopNfc(NfcManager);
  }
}

export async function eraseTag() {
  const { default: NfcManager, NfcTech, Ndef } = await readyNfc();
  await NfcManager.requestTechnology(NfcTech.Ndef);
  try {
    const bytes = Ndef.encodeMessage([Ndef.textRecord("")]);
    await NfcManager.ndefHandler.writeNdefMessage(bytes);
  } finally {
    await stopNfc(NfcManager);
  }
}

export function cancelNfc() {
  import("react-native-nfc-manager")
    .then((m) => m.default.cancelTechnologyRequest())
    .catch(() => undefined);
}
