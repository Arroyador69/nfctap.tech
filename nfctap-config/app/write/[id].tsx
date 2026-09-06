import { NfcSheet } from "@/src/NfcSheet";
import { pushHistory } from "@/src/history";
import { cancelNfc, writePayload } from "@/src/nfc";
import { TEMPLATES, buildPayload, defaultsFor } from "@/src/templates";
import { colors } from "@/src/theme";
import { useLocalSearchParams } from "expo-router";
import { useMemo, useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native";

export default function WriteScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const template = TEMPLATES.find((t) => t.id === id);
  const [values, setValues] = useState<Record<string, string>>(() =>
    template ? defaultsFor(template) : {},
  );
  const [sheet, setSheet] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [ok, setOk] = useState("");

  const preview = useMemo(() => {
    if (!template) return "";
    const built = buildPayload(template.id, values);
    return built.uri || built.text || built.vcard || built.label;
  }, [template, values]);

  if (!template) {
    return (
      <View style={{ padding: 20 }}>
        <Text>Plantilla no encontrada.</Text>
      </View>
    );
  }

  const ready = template.fields.every((f) => {
    if (f.optional) return true;
    return Boolean((values[f.key] ?? f.defaultValue ?? "").trim());
  });

  async function write() {
    if (!template) return;
    const built = buildPayload(template.id, values);
    const payload = {
      uri: built.uri,
      vcard: built.vcard,
      androidId: built.androidId,
      text: built.text,
      wifi: built.wifi,
    };
    setSheet(true);
    setBusy(true);
    setError("");
    setOk("");
    try {
      await writePayload(payload);
      await pushHistory({
        templateId: template.id,
        title: template.title,
        label: built.label,
        payload,
      });
      setOk("Escrita. Comprueba con otro móvil, no con este.");
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo escribir");
    } finally {
      setBusy(false);
    }
  }

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 40 }} keyboardShouldPersistTaps="handled">
        <Text style={{ fontSize: 24, fontWeight: "700", color: colors.ink }}>{template.title}</Text>
        <Text style={{ marginTop: 8, color: colors.muted, lineHeight: 21 }}>{template.blurb}</Text>

        {template.fields.map((f) => (
          <View key={f.key} style={{ marginTop: 16 }}>
            <Text style={{ color: colors.ink, marginBottom: 6 }}>{f.label}</Text>
            {f.options ? (
              <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
                {f.options.map((opt) => {
                  const active = (values[f.key] || f.defaultValue) === opt.value;
                  return (
                    <Pressable
                      key={opt.value}
                      onPress={() => setValues((s) => ({ ...s, [f.key]: opt.value }))}
                      style={{
                        borderRadius: 999,
                        paddingVertical: 10,
                        paddingHorizontal: 14,
                        backgroundColor: active ? colors.ink : colors.card,
                        borderWidth: 1,
                        borderColor: colors.line,
                      }}
                    >
                      <Text style={{ color: active ? colors.bg : colors.ink, fontSize: 13 }}>{opt.label}</Text>
                    </Pressable>
                  );
                })}
              </View>
            ) : (
              <TextInput
                value={values[f.key] ?? f.defaultValue ?? ""}
                onChangeText={(t) => setValues((s) => ({ ...s, [f.key]: t }))}
                placeholder={f.placeholder}
                placeholderTextColor="#b3aa9c"
                autoCapitalize={f.keyboard === "url" || f.keyboard === "email" ? "none" : "sentences"}
                autoCorrect={false}
                secureTextEntry={f.key === "password"}
                keyboardType={
                  f.keyboard === "url"
                    ? "url"
                    : f.keyboard === "email"
                      ? "email-address"
                      : f.keyboard === "phone"
                        ? "phone-pad"
                        : "default"
                }
                multiline={f.multiline}
                style={{
                  backgroundColor: colors.card,
                  borderWidth: 1,
                  borderColor: colors.line,
                  borderRadius: 14,
                  paddingHorizontal: 14,
                  paddingVertical: 12,
                  fontSize: 16,
                  minHeight: f.multiline ? 90 : 48,
                  color: colors.ink,
                }}
              />
            )}
          </View>
        ))}

        {!!preview && (
          <View style={{ marginTop: 18, backgroundColor: "#faf6ee", borderRadius: 14, padding: 12 }}>
            <Text style={{ fontSize: 12, color: colors.muted }}>Se grabará</Text>
            <Text selectable style={{ marginTop: 4, color: colors.ink }}>
              {preview}
            </Text>
          </View>
        )}

        <Pressable
          disabled={!ready}
          onPress={write}
          style={{
            marginTop: 22,
            backgroundColor: colors.ink,
            opacity: ready ? 1 : 0.35,
            borderRadius: 999,
            paddingVertical: 16,
            alignItems: "center",
          }}
        >
          <Text style={{ color: colors.bg, fontWeight: "700", fontSize: 16 }}>Acercar pegatina y escribir</Text>
        </Pressable>
      </ScrollView>

      <NfcSheet
        visible={sheet}
        title={ok ? "Listo" : error ? "No se escribió" : "Acerca la pegatina"}
        hint={
          ok || error
            ? "Puedes repetir con otra tira."
            : "Móvil plano sobre el NFC, 1–2 segundos."
        }
        busy={busy}
        error={error}
        ok={ok}
        onClose={() => {
          cancelNfc();
          setSheet(false);
        }}
      />
    </KeyboardAvoidingView>
  );
}
