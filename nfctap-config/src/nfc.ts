import Constants from "expo-constants";
import { Platform } from "react-native";

export function isExpoGo() {
  return Constants.appOwnership === "expo";
}

export async function nfcSupported(): Promise<boolean> {
  if (isExpoGo()) return false;
  try {
    const NfcManager = (await import("react-native-nfc-manager")).default;
    const ok = await NfcManager.isSupported();
    if (ok) await NfcManager.start();
    return ok;
  } catch {
    return false;
  }
}

export type WritePayload = {
  uri?: string;
  text?: string;
  vcard?: string;
  androidId?: string;
  wifi?: number[];
};

export async function writePayload(payload: WritePayload) {
  if (isExpoGo()) {
    throw new Error(
      "Expo Go no escribe NFC. En el Mac: npx expo run:android (o run:ios) con el móvil por USB.",
    );
  }
  const { default: NfcManager, NfcTech, Ndef } = await import("react-native-nfc-manager");
  const records = [];
  if (payload.uri) records.push(Ndef.uriRecord(payload.uri));
  if (payload.text) records.push(Ndef.textRecord(payload.text));
  if (payload.vcard) {
    records.push(Ndef.mimeMediaRecord("text/vcard", payload.vcard));
  }
  if (payload.wifi?.length) {
    records.push(Ndef.mimeMediaRecord("application/vnd.wfa.wsc", payload.wifi));
  }
  if (payload.androidId && Platform.OS === "android") {
    records.push(Ndef.androidApplicationRecord(payload.androidId));
  }
  if (!records.length) throw new Error("Nada que escribir");

  await NfcManager.requestTechnology(NfcTech.Ndef);
  try {
    const bytes = Ndef.encodeMessage(records);
    if (!bytes) throw new Error("No se pudo preparar el mensaje NDEF");
    await NfcManager.ndefHandler.writeNdefMessage(bytes);
  } finally {
    NfcManager.cancelTechnologyRequest();
  }
}

export type ReadResult = {
  id?: string;
  writable?: boolean;
  records: { type: string; value: string }[];
};

export async function readTag(): Promise<ReadResult> {
  if (isExpoGo()) {
    throw new Error("Expo Go no lee NFC. Usa el build nativo.");
  }
  const { default: NfcManager, NfcTech, Ndef } = await import("react-native-nfc-manager");
  await NfcManager.requestTechnology(NfcTech.Ndef);
  try {
    const tag = await NfcManager.getTag();
    const records = (tag?.ndefMessage ?? []).map((rec) => {
      const type = Array.isArray(rec.type)
        ? String.fromCharCode(...rec.type)
        : String(rec.type ?? "");
      const payload = rec.payload ?? [];
      try {
        if (type === "U") return { type: "URL", value: Ndef.uri.decodePayload(payload) };
        if (type === "T") return { type: "Texto", value: Ndef.text.decodePayload(payload) };
      } catch {
        /* raw */
      }
      return { type: type || "dato", value: String.fromCharCode(...payload.filter((b) => b >= 32)) };
    });
    return { id: tag?.id, writable: tag?.isWritable, records };
  } finally {
    NfcManager.cancelTechnologyRequest();
  }
}

export async function eraseTag() {
  if (isExpoGo()) throw new Error("Expo Go no borra NFC. Usa el build nativo.");
  const { default: NfcManager, NfcTech, Ndef } = await import("react-native-nfc-manager");
  await NfcManager.requestTechnology(NfcTech.Ndef);
  try {
    const bytes = Ndef.encodeMessage([Ndef.textRecord("")]);
    await NfcManager.ndefHandler.writeNdefMessage(bytes);
  } finally {
    NfcManager.cancelTechnologyRequest();
  }
}

export function cancelNfc() {
  import("react-native-nfc-manager")
    .then((m) => m.default.cancelTechnologyRequest())
    .catch(() => undefined);
}
