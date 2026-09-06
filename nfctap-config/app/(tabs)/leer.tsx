import { NfcSheet } from "@/src/NfcSheet";
import { cancelNfc, eraseTag, nfcMessage, readTag, type ReadResult } from "@/src/nfc";
import { colors } from "@/src/theme";
import { useState } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";

export default function LeerScreen() {
  const [sheet, setSheet] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<ReadResult | null>(null);
  const [ok, setOk] = useState("");

  async function scan() {
    setSheet(true);
    setBusy(true);
    setError("");
    setOk("");
    setResult(null);
    try {
      setResult(await readTag());
      setOk("Leída");
    } catch (e) {
      setError(nfcMessage(e, "No se pudo leer"));
    } finally {
      setBusy(false);
    }
  }

  async function wipe() {
    setSheet(true);
    setBusy(true);
    setError("");
    setOk("");
    try {
      await eraseTag();
      setResult(null);
      setOk("Chip vaciado. Ya puedes escribir otra vez.");
    } catch (e) {
      setError(nfcMessage(e, "No se pudo borrar"));
    } finally {
      setBusy(false);
    }
  }

  return (
    <ScrollView contentContainerStyle={{ padding: 20 }}>
      <Text style={{ fontSize: 28, fontWeight: "700", color: colors.ink }}>Leer / borrar</Text>
      <Text style={{ marginTop: 8, color: colors.muted, lineHeight: 22 }}>
        Comprueba una tira ya grabada o vacíala para reprogramarla. No hay bloqueo permanente en esta
        app: así no te cargas un chip el primer día.
      </Text>

      <Pressable
        onPress={scan}
        style={{
          marginTop: 22,
          backgroundColor: colors.ink,
          borderRadius: 999,
          paddingVertical: 16,
          alignItems: "center",
        }}
      >
        <Text style={{ color: colors.bg, fontWeight: "700" }}>Leer pegatina</Text>
      </Pressable>
      <Pressable
        onPress={wipe}
        style={{
          marginTop: 10,
          borderRadius: 999,
          paddingVertical: 16,
          alignItems: "center",
          borderWidth: 1,
          borderColor: colors.line,
        }}
      >
        <Text style={{ color: colors.ink, fontWeight: "600" }}>Vaciar pegatina</Text>
      </Pressable>

      {result && (
        <View style={{ marginTop: 22, backgroundColor: colors.card, borderRadius: 18, padding: 16, borderWidth: 1, borderColor: colors.line }}>
          <Text style={{ color: colors.muted, fontSize: 12 }}>UID {result.id || "—"}</Text>
          <Text style={{ marginTop: 4, color: colors.muted, fontSize: 12 }}>
            {result.writable === false ? "Solo lectura" : "Se puede escribir"}
          </Text>
          {result.records.length === 0 ? (
            <Text style={{ marginTop: 12, color: colors.ink }}>Sin datos NDEF (vacía o no formateada).</Text>
          ) : (
            result.records.map((r, i) => (
              <View key={`${r.type}-${i}`} style={{ marginTop: 12 }}>
                <Text style={{ color: colors.goldSoft, fontSize: 12 }}>{r.type}</Text>
                <Text selectable style={{ color: colors.ink, marginTop: 4 }}>
                  {r.value}
                </Text>
              </View>
            ))
          )}
        </View>
      )}

      <NfcSheet
        visible={sheet}
        title={ok || error ? (ok ? "Hecho" : "Error") : "Acerca la pegatina"}
        hint="Plana contra el móvil, un segundo."
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
