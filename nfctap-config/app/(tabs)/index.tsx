import { WriteForm } from "@/src/WriteForm";
import { isExpoGo } from "@/src/nfc";
import { GROUPS, TEMPLATES } from "@/src/templates";
import { colors } from "@/src/theme";
import { useMemo, useState } from "react";
import { Pressable, ScrollView, Text, TextInput, View } from "react-native";

export default function ConfigHome() {
  const [q, setQ] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return TEMPLATES;
    return TEMPLATES.filter(
      (t) => t.title.toLowerCase().includes(s) || t.blurb.toLowerCase().includes(s),
    );
  }, [q]);

  if (selectedId) {
    return <WriteForm templateId={selectedId} onBack={() => setSelectedId(null)} />;
  }

  return (
    <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 40 }} keyboardShouldPersistTaps="handled">
      <Text style={{ fontSize: 13, letterSpacing: 1.4, color: colors.goldSoft, textTransform: "uppercase" }}>
        NFCTap Config
      </Text>
      <Text style={{ marginTop: 6, fontSize: 28, fontWeight: "700", color: colors.ink }}>
        Programa la pegatina
      </Text>
      <Text style={{ marginTop: 8, color: colors.muted, lineHeight: 22 }}>
        Elige qué grabar, pega el enlace y acerca la pegatina. El cliente solo toca: no instala esta app.
      </Text>

      <TextInput
        value={q}
        onChangeText={setQ}
        placeholder="Buscar: enlace, Google, WhatsApp, Wi‑Fi…"
        placeholderTextColor="#b3aa9c"
        autoCorrect={false}
        style={{
          marginTop: 16,
          backgroundColor: colors.card,
          borderWidth: 1,
          borderColor: colors.line,
          borderRadius: 14,
          paddingHorizontal: 14,
          paddingVertical: 12,
          fontSize: 16,
          color: colors.ink,
        }}
      />

      {isExpoGo() && (
        <View style={{ marginTop: 16, backgroundColor: "#fff4d6", borderRadius: 16, padding: 14 }}>
          <Text style={{ color: colors.ink, fontWeight: "600" }}>Estás en Expo Go</Text>
          <Text style={{ marginTop: 6, color: colors.muted, lineHeight: 20 }}>
            Aquí ves plantillas y formularios. Para grabar de verdad usa la app de TestFlight.
          </Text>
        </View>
      )}

      {GROUPS.map((g) => {
        const items = filtered.filter((t) => t.group === g.id);
        if (!items.length) return null;
        return (
          <View key={g.id} style={{ marginTop: 22 }}>
            <Text style={{ fontSize: 16, fontWeight: "700", color: colors.ink }}>{g.title}</Text>
            <View style={{ marginTop: 10, gap: 8 }}>
              {items.map((t) => (
                <Pressable
                  key={t.id}
                  onPress={() => setSelectedId(t.id)}
                  style={{
                    backgroundColor: colors.card,
                    borderColor: colors.line,
                    borderWidth: 1,
                    borderRadius: 18,
                    padding: 14,
                  }}
                >
                  <Text style={{ fontWeight: "700", color: colors.ink }}>{t.title}</Text>
                  <Text style={{ marginTop: 4, color: colors.muted, fontSize: 13 }}>{t.blurb}</Text>
                </Pressable>
              ))}
            </View>
          </View>
        );
      })}
    </ScrollView>
  );
}
