import { AppText, Button, Notice, Card } from "@/components/ui";
import { useDataStore } from "@/store/use-data-store";
export function DataStatus() {
  const { ready, busy, error, load } = useDataStore();
  if (error)
    return (
      <Card>
        <AppText>{error}</AppText>
        <Button
          secondary
          title="重新读取本地数据"
          onPress={() => void load()}
        />
      </Card>
    );
  if (!ready || busy)
    return (
      <Notice>{busy ? "正在读取或保存，请稍候…" : "本地数据尚未就绪"}</Notice>
    );
  return null;
}
