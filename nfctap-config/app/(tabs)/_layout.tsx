import { colors } from "@/src/theme";
import { Tabs } from "expo-router";

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerStyle: { backgroundColor: colors.bg },
        headerTintColor: colors.ink,
        headerShadowVisible: false,
        tabBarActiveTintColor: colors.ink,
        tabBarInactiveTintColor: colors.muted,
        tabBarStyle: { backgroundColor: colors.bg, borderTopColor: colors.line },
      }}
    >
      <Tabs.Screen name="index" options={{ title: "Configurar", tabBarLabel: "Configurar" }} />
      <Tabs.Screen name="leer" options={{ title: "Leer", tabBarLabel: "Leer" }} />
      <Tabs.Screen name="historial" options={{ title: "Historial", tabBarLabel: "Historial" }} />
    </Tabs>
  );
}
