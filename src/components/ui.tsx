import type { PropsWithChildren } from "react";
import {
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  KeyboardAvoidingView,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { radius, space, useTheme } from "@/theme/tokens";

export function AppText({
  children,
  kind = "body",
}: PropsWithChildren<{
  kind?: "body" | "title" | "heading" | "caption" | "hero";
}>) {
  const { colors } = useTheme();
  return (
    <Text
      style={[
        styles[kind],
        { color: kind === "caption" ? colors.muted : colors.text },
      ]}
    >
      {children}
    </Text>
  );
}
export function Screen({
  title,
  subtitle,
  children,
  compact = false,
}: PropsWithChildren<{ title: string; subtitle: string; compact?: boolean }>) {
  const { colors } = useTheme();
  return (
    <SafeAreaView
      edges={Platform.OS === "web" ? [] : ["top", "left", "right"]}
      style={{ flex: 1, backgroundColor: colors.background }}
    >
      <KeyboardAvoidingView style={{flex: 1}} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.screen, compact && {paddingHorizontal: 4}]}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.header}>
          <AppText kind="caption">月相 CYCLE · 与自己同步</AppText>
          <AppText kind="title">{title}</AppText>
          <AppText kind="caption">{subtitle}</AppText>
        </View>
        {children}
      </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
export function Card({
  children,
  tinted = false,
  compact = false,
}: PropsWithChildren<{ tinted?: boolean; compact?: boolean }>) {
  const { colors } = useTheme();
  return (
    <View
      style={[
        styles.card,
        compact && {paddingHorizontal: 1, gap: 8},
        {
          backgroundColor: tinted ? colors.tint : colors.surface,
          borderColor: tinted ? colors.accent : colors.border,
        },
      ]}
    >
      {children}
    </View>
  );
}
export function Button({
  title,
  onPress,
  secondary = false,
  disabled = false,
}: {
  title: string;
  onPress: () => void;
  secondary?: boolean;
  disabled?: boolean;
}) {
  const { colors } = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.button,
        {
          backgroundColor: secondary ? colors.surface : colors.primary,
          borderColor: colors.primary,
          opacity: disabled ? 0.45 : pressed ? 0.7 : 1,
        },
      ]}
    >
      <Text
        style={[
          styles.buttonText,
          { color: secondary ? colors.primary : colors.onPrimary },
        ]}
      >
        {title}
      </Text>
    </Pressable>
  );
}
export function Row({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.row}>
      <View style={{ flex: 1 }}>
        <AppText>{label}</AppText>
      </View>
      <View style={{ flex: 1 }}>
        <AppText kind="caption">{value}</AppText>
      </View>
    </View>
  );
}
export function Notice({ children }: PropsWithChildren) {
  return (
    <Card>
      <AppText kind="caption">{children}</AppText>
    </Card>
  );
}
const styles = StyleSheet.create({
  screen: {
    padding: space.md,
    paddingBottom: 48,
    gap: space.md,
    width: "100%",
    maxWidth: 600,
    alignSelf: "center",
  },
  header: { gap: space.sm, paddingVertical: space.md },
  card: {
    padding: space.md,
    borderRadius: radius.card,
    borderWidth: 1,
    gap: space.md,
  },
  body: { fontSize: 16, lineHeight: 25 },
  caption: { fontSize: 13, lineHeight: 21 },
  title: { fontSize: 32, fontWeight: "600", lineHeight: 42 },
  heading: { fontSize: 20, fontWeight: "600", lineHeight: 28 },
  hero: { fontSize: 48, fontWeight: "300", lineHeight: 60 },
  button: {
    minHeight: 48,
    minWidth: 44,
    borderWidth: 1,
    borderRadius: radius.sm,
    padding: space.md,
    justifyContent: "center",
    alignItems: "center",
  },
  buttonText: { fontSize: 16, fontWeight: "600" },
  row: { flexDirection: "row", alignItems: "center", gap: space.md },
});
