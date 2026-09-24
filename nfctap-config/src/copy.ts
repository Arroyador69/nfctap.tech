import { Share } from "react-native";

export async function copyText(value: string): Promise<boolean> {
  const text = value.trim();
  if (!text) return false;
  try {
    const Clipboard = await import("expo-clipboard");
    await Clipboard.setStringAsync(text);
    return true;
  } catch {
    try {
      await Share.share({ message: text });
      return true;
    } catch {
      return false;
    }
  }
}
