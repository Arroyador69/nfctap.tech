import { colors } from "@/src/theme";
import type { ReactNode } from "react";
import { ActivityIndicator, Modal, Pressable, ScrollView, Text, View } from "react-native";

type Props = {
  visible: boolean;
  title: string;
  hint: string;
  busy?: boolean;
  error?: string;
  ok?: string;
  extra?: ReactNode;
  onClose: () => void;
};

export function NfcSheet({ visible, title, hint, busy, error, ok, extra, onClose }: Props) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={{ flex: 1, backgroundColor: "rgba(28,25,21,0.45)", justifyContent: "flex-end" }}>
        <View
          style={{
            backgroundColor: colors.card,
            borderTopLeftRadius: 28,
            borderTopRightRadius: 28,
            padding: 24,
            paddingBottom: 36,
            maxHeight: "88%",
          }}
        >
          <ScrollView keyboardShouldPersistTaps="handled">
          <Text style={{ fontSize: 22, fontWeight: "700", color: colors.ink }}>{title}</Text>
          <Text style={{ marginTop: 8, color: colors.muted, lineHeight: 22 }}>{hint}</Text>
          {busy && <ActivityIndicator style={{ marginTop: 20 }} color={colors.ink} />}
          {error ? <Text style={{ marginTop: 16, color: "#9b1c1c" }}>{error}</Text> : null}
          {ok ? <Text style={{ marginTop: 16, color: "#1f6b3a" }}>{ok}</Text> : null}
          {extra}
          <Pressable
            onPress={onClose}
            style={{
              marginTop: 20,
              backgroundColor: colors.ink,
              borderRadius: 999,
              paddingVertical: 14,
              alignItems: "center",
            }}
          >
            <Text style={{ color: colors.bg, fontWeight: "700" }}>{ok || error ? "Cerrar" : "Cancelar"}</Text>
          </Pressable>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}
