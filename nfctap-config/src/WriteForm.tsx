import { NfcSheet } from "@/src/NfcSheet";
import { pushHistory } from "@/src/history";
import { cancelNfc, nfcMessage, writePayload } from "@/src/nfc";
import { lookupReviewPlaces, type PlaceHit } from "@/src/places";
import { TEMPLATES, buildPayload, defaultsFor } from "@/src/templates";
import { colors } from "@/src/theme";
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

type Props = {
  templateId: string;
  onBack?: () => void;
};

export function WriteForm({ templateId, onBack }: Props) {
  const id = Array.isArray(templateId) ? templateId[0] : templateId;
  const template = TEMPLATES.find((t) => t.id === id);
  const [values, setValues] = useState<Record<string, string>>(() =>
    template ? defaultsFor(template) : {},
  );
  const [sheet, setSheet] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [ok, setOk] = useState("");
  const [placeHits, setPlaceHits] = useState<PlaceHit[]>([]);
  const [placeBusy, setPlaceBusy] = useState(false);
  const [placeError, setPlaceError] = useState("");

  const preview = useMemo(() => {
    if (!template) return "";
    try {
      const built = buildPayload(template.id, values);
      return built.uri || built.text || built.vcard || built.label;
    } catch {
      return "";
    }
  }, [template, values]);

  if (!template) {
    return (
      <View style={{ padding: 20 }}>
        <Text style={{ color: colors.ink }}>Plantilla no encontrada.</Text>
        {onBack ? (
          <Pressable onPress={onBack} style={{ marginTop: 16 }}>
            <Text style={{ color: colors.goldSoft, fontWeight: "600" }}>← Volver</Text>
          </Pressable>
        ) : null}
      </View>
    );
  }

  const ready = template.fields.every((f) => {
    if (f.optional) return true;
    return Boolean((values[f.key] ?? f.defaultValue ?? "").trim());
  });

  async function searchPlaces() {
    const q = (values.query || "").trim();
    if (q.length < 3) {
      setPlaceError("Nombre y pueblo, o pega el enlace de Google.");
      return;
    }
    setPlaceBusy(true);
    setPlaceError("");
    try {
      const hits = await lookupReviewPlaces(q);
      setPlaceHits(hits);
      if (!hits.length) setPlaceError("Nada. Prueba con el pueblo o pega el enlace.");
    } catch (e) {
      setPlaceHits([]);
      setPlaceError(e instanceof Error ? e.message : "No se pudo buscar");
    } finally {
      setPlaceBusy(false);
    }
  }

  async function write() {
    if (!template) return;
    let built;
    try {
      built = buildPayload(template.id, values);
    } catch (e) {
      setError(nfcMessage(e, "Revisa los datos"));
      setSheet(true);
      return;
    }
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
      setError(nfcMessage(e, "No se pudo escribir"));
    } finally {
      setBusy(false);
    }
  }

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 40 }} keyboardShouldPersistTaps="handled">
        {onBack ? (
          <Pressable onPress={onBack} hitSlop={12} style={{ alignSelf: "flex-start", marginBottom: 10 }}>
            <Text style={{ color: colors.goldSoft, fontWeight: "600" }}>← Plantillas</Text>
          </Pressable>
        ) : null}

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
            {template.id === "google" && f.key === "query" ? (
              <Pressable
                onPress={searchPlaces}
                disabled={placeBusy}
                style={{
                  marginTop: 10,
                  alignSelf: "flex-start",
                  backgroundColor: colors.ink,
                  opacity: placeBusy ? 0.5 : 1,
                  borderRadius: 999,
                  paddingVertical: 10,
                  paddingHorizontal: 16,
                }}
              >
                <Text style={{ color: colors.bg, fontWeight: "700", fontSize: 14 }}>
                  {placeBusy ? "Buscando…" : "Buscar enlace de reseña"}
                </Text>
              </Pressable>
            ) : null}
          </View>
        ))}

        {template.id === "google" && placeError ? (
          <Text style={{ marginTop: 10, color: "#b42318", fontSize: 13 }}>{placeError}</Text>
        ) : null}
        {template.id === "google" &&
          placeHits.map((h) => (
            <Pressable
              key={h.reviewUrl}
              onPress={() => {
                setValues((s) => ({ ...s, url: h.reviewUrl }));
                setPlaceHits([]);
              }}
              style={{
                marginTop: 10,
                backgroundColor: "#faf6ee",
                borderRadius: 14,
                padding: 12,
                borderWidth: 1,
                borderColor: colors.line,
              }}
            >
              <Text style={{ color: colors.ink, fontWeight: "600" }}>{h.name}</Text>
              {h.address ? (
                <Text style={{ marginTop: 2, color: colors.muted, fontSize: 12 }}>{h.address}</Text>
              ) : null}
              <Text style={{ marginTop: 6, color: colors.goldSoft, fontSize: 12 }}>
                {h.directReview ? "Formulario de reseña · tocar para usar" : "Ficha Maps · tocar para usar"}
              </Text>
            </Pressable>
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
            ? "Puedes repetir con otra pegatina."
            : "Móvil plano sobre el NFC, 1–2 segundos. Espera el aviso del sistema."
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
