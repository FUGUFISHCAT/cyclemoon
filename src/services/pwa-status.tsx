import { AppText, Card } from "@/components/ui";
export function PwaStatus() {
  return (
    <Card>
      <AppText kind="heading">原生能力预留</AppText>
      <AppText>
        此构建不使用 Service Worker。SQLite 与 expo-notifications
        将在未来原生版单独接入。
      </AppText>
    </Card>
  );
}
