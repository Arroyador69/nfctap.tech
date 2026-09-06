import { colors } from "@/src/theme";
import { Stack } from "expo-router";

export default function WriteLayout() {
  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: colors.bg },
        headerTintColor: colors.ink,
        headerShadowVisible: false,
        contentStyle: { backgroundColor: colors.bg },
      }}
    >
      <Stack.Screen name="[id]" options={{ title: "Programar" }} />
    </Stack>
  );
}
