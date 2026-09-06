import { colors } from "@/src/theme";
import { Link, Stack } from "expo-router";
import { Text, View } from "react-native";

export default function NotFound() {
  return (
    <>
      <Stack.Screen options={{ title: "NFCTap" }} />
      <View style={{ flex: 1, padding: 24, backgroundColor: colors.bg }}>
        <Text style={{ fontSize: 22, fontWeight: "700", color: colors.ink }}>Pantalla no encontrada</Text>
        <Link href="/" style={{ marginTop: 16 }}>
          <Text style={{ color: colors.goldSoft, fontWeight: "600" }}>Volver a configurar</Text>
        </Link>
      </View>
    </>
  );
}
