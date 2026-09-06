import AsyncStorage from "@react-native-async-storage/async-storage";
import type { WritePayload } from "./nfc";

export type HistoryItem = {
  id: string;
  at: string;
  templateId: string;
  title: string;
  label: string;
  payload: WritePayload;
};

const KEY = "nfctap-history";

export async function loadHistory(): Promise<HistoryItem[]> {
  const raw = await AsyncStorage.getItem(KEY);
  if (!raw) return [];
  try {
    return JSON.parse(raw) as HistoryItem[];
  } catch {
    return [];
  }
}

export async function pushHistory(item: Omit<HistoryItem, "id" | "at">) {
  const list = await loadHistory();
  const next: HistoryItem[] = [
    { ...item, id: `${Date.now()}`, at: new Date().toISOString() },
    ...list,
  ].slice(0, 40);
  await AsyncStorage.setItem(KEY, JSON.stringify(next));
  return next;
}
