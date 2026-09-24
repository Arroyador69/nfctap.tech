import { copyText } from "@/src/copy";
import { colors } from "@/src/theme";
import type { WifiCreds } from "@/src/wifi";
import { useState } from "react";
import { Pressable, Text, View } from "react-native";

type Props = {
  creds: WifiCreds;
};

export function WifiCredsCard({ creds }: Props) {
  const [copied, setCopied] = useState<"ssid" | "password" | "">("");
  const open = creds.auth === "open" || !creds.password;

  async function copy(what: "ssid" | "password", value: string) {
    const ok = await copyText(value);
    if (!ok) return;
    setCopied(what);
    setTimeout(() => setCopied(""), 2000);
  }

  return (
    <View
      style={{
        marginTop: 16,
        backgroundColor: colors.ink,
        borderRadius: 18,
        padding: 16,
      }}
    >
      <Text style={{ color: "#b9ae99", fontSize: 12 }}>Red</Text>
      <Text selectable style={{ marginTop: 4, color: colors.bg, fontSize: 22, fontWeight: "700" }}>
        {creds.ssid}
      </Text>
      <Pressable
        onPress={() => copy("ssid", creds.ssid)}
        style={{
          marginTop: 12,
          borderRadius: 999,
          borderWidth: 1,
          borderColor: "#f6f1e7",
          paddingVertical: 12,
          alignItems: "center",
        }}
      >
        <Text style={{ color: colors.bg, fontWeight: "700" }}>
          {copied === "ssid" ? "Nombre copiado" : "Copiar nombre"}
        </Text>
      </Pressable>

      <Text style={{ marginTop: 18, color: "#b9ae99", fontSize: 12 }}>
        {open ? "Red abierta" : "Contraseña"}
      </Text>
      <Text selectable style={{ marginTop: 4, color: colors.bg, fontSize: 22, fontWeight: "700" }}>
        {open ? "Sin clave" : creds.password}
      </Text>
      {!open ? (
        <Pressable
          onPress={() => copy("password", creds.password)}
          style={{
            marginTop: 12,
            backgroundColor: "#e2b43a",
            borderRadius: 999,
            paddingVertical: 14,
            alignItems: "center",
          }}
        >
          <Text style={{ color: colors.ink, fontWeight: "800", fontSize: 16 }}>
            {copied === "password" ? "Contraseña copiada" : "Copiar contraseña"}
          </Text>
        </Pressable>
      ) : null}
      <Text style={{ marginTop: 12, color: "#b9ae99", fontSize: 12, lineHeight: 18 }}>
        En el iPhone pégala en Ajustes → Wi‑Fi. El TAP no une solo.
      </Text>
    </View>
  );
}
