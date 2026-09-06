import { loadHistory, type HistoryItem } from "@/src/history";
import { cancelNfc, nfcMessage, writePayload } from "@/src/nfc";
import { NfcSheet } from "@/src/NfcSheet";
import { colors } from "@/src/theme";
import { useFocusEffect } from "expo-router";
import { useCallback, useState } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";

export default function HistorialScreen() {
  const [items, setItems] = useState<HistoryItem[]>([]);
  const [sheet, setSheet] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [ok, setOk] = useState("");

  useFocusEffect(
    useCallback(() => {
      loadHistory().then(setItems);
    }, []),
  );

  async function rewrite(item: HistoryItem) {
    setSheet(true);
    setBusy(true);
    setError("");
    setOk("");
    try {
      await writePayload(item.payload);
      setOk("Reescrita en la pegatina.");
    } catch (e) {
      setError(nfcMessage(e, "No se pudo escribir"));
    } finally {
      setBusy(false);
    }
  }

  return (
    <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 40 }}>
      <Text style={{ fontSize: 28, fontWeight: "700", color: colors.ink }}>Historial</Text>
      <Text style={{ marginTop: 8, color: colors.muted }}>
        Se queda en este móvil. Toca una para grabar la misma en otra tira.
      </Text>
      {items.length === 0 ? (
        <Text style={{ marginTop: 24, color: colors.muted }}>Aún no has programado ninguna.</Text>
      ) : (
        items.map((item) => (
          <Pressable
            key={item.id}
            onPress={() => rewrite(item)}
            style={{
              marginTop: 12,
              backgroundColor: colors.card,
              borderRadius: 16,
              padding: 14,
              borderWidth: 1,
              borderColor: colors.line,
            }}
          >
            <Text style={{ fontWeight: "700", color: colors.ink }}>{item.title}</Text>
            <Text style={{ marginTop: 4, color: colors.muted }}>{item.label}</Text>
            <Text style={{ marginTop: 6, fontSize: 11, color: colors.goldSoft }}>
              {new Date(item.at).toLocaleString("es-ES")} · tocar para repetir
            </Text>
          </Pressable>
        ))
      )}
      <NfcSheet
        visible={sheet}
        title={ok || error ? (ok ? "Hecho" : "Error") : "Acerca la pegatina"}
        hint="Misma programación que la vez anterior."
        busy={busy}
        error={error}
        ok={ok}
        onClose={() => {
          cancelNfc();
          setSheet(false);
        }}
      />
    </ScrollView>
  );
}
