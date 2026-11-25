import type { PropsWithChildren } from "react";
import { KeyboardAvoidingView, Modal, Platform, ScrollView, View } from "react-native";
import { Button } from "./ui";
import { useTheme } from "@/theme/tokens";

export function Sheet({visible, onClose, children}: PropsWithChildren<{visible: boolean; onClose: () => void}>) {
  const {colors} = useTheme();
  return <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
    <KeyboardAvoidingView nativeID="cycle-record-sheet" style={{flex: 1, backgroundColor: colors.background}} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled" contentContainerStyle={{padding: 16, paddingTop: 32, paddingBottom: 64, gap: 16, width: "100%", maxWidth: 600, alignSelf: "center"}}>
        <Button secondary title="关闭记录" onPress={onClose}/>
        <View accessibilityViewIsModal style={{gap: 16}}>{children}</View>
      </ScrollView>
    </KeyboardAvoidingView>
  </Modal>;
}
