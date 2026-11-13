import type { Reminder } from "@/domain/reminders";
export interface NativeNotificationAdapter {
  replaceFuture(reminders: Reminder[]): Promise<void>;
}
export function createNativeNotifications(): NativeNotificationAdapter {
  return {
    async replaceFuture() {
      throw new Error(
        "expo-notifications 适配尚未实现，需要独立原生权限与真机验证。",
      );
    },
  };
}
