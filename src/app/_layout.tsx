import { Tabs } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { Platform, Text } from "react-native";
import { useEffect } from "react";
import { useDataStore } from "@/store/use-data-store";
import { useTheme } from "@/theme/tokens";

export { ErrorBoundary } from "expo-router";

const tabs = [
  { name: "index", title: "首页", icon: "◒" },
  { name: "calendar", title: "日历", icon: "▦" },
  { name: "record", title: "记录", icon: "＋" },
  { name: "insights", title: "洞察", icon: "≈" },
  { name: "settings", title: "设置", icon: "⚙" },
] as const;
export default function RootLayout() {
  const privacyEpoch = useDataStore((s) => s.privacyEpoch);
  const { colors, dark } = useTheme();
  useEffect(() => {
    void useDataStore.getState().load();
    if (typeof window === "undefined") return;
    const sync = () => void useDataStore.getState().load();
    const visible = () => {
      if (document.visibilityState === "visible") sync();
    };
    const channel =
      typeof BroadcastChannel !== "undefined"
        ? new BroadcastChannel("cyclemoon-revision")
        : null;
    channel?.addEventListener("message", sync);
    window.addEventListener("focus", sync);
    document.addEventListener("visibilitychange", visible);
    return () => {
      channel?.close();
      window.removeEventListener("focus", sync);
      document.removeEventListener("visibilitychange", visible);
    };
  }, []);
  return (
    <>
      <StatusBar style={dark ? "light" : "dark"} />
      <Tabs
        key={privacyEpoch}
        safeAreaInsets={
          Platform.OS === "web"
            ? { top: 0, right: 0, bottom: 0, left: 0 }
            : undefined
        }
        screenOptions={{
          headerShown: false,
          tabBarActiveTintColor: colors.primary,
          tabBarInactiveTintColor: colors.muted,
          sceneStyle: { backgroundColor: colors.background },
          tabBarStyle: {
            minHeight: 60,
            backgroundColor: colors.surface,
            borderTopColor: colors.border,
          },
          tabBarLabelStyle: { fontSize: 12 },
        }}
      >
        {tabs.map((tab) => (
          <Tabs.Screen
            key={tab.name}
            name={tab.name}
            options={{
              title: tab.title,
              tabBarAccessibilityLabel: tab.title,
              tabBarIcon: ({ color }) => (
                <Text accessible={false} style={{ fontSize: 24, color }}>
                  {tab.icon}
                </Text>
              ),
            }}
          />
        ))}
      </Tabs>
    </>
  );
}
