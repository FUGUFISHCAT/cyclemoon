import { useEffect, useState } from "react";
import { AppText, Button, Card } from "@/components/ui";
type PwaInfo = { status: string; waiting: boolean };
export function PwaStatus() {
  const [info, setInfo] = useState<PwaInfo>({
      status: "等待离线状态检查",
      waiting: false,
    }),
    [storage, setStorage] = useState("");
  useEffect(() => {
    const read = () => {
      const client = (window as Window & { cyclePwa?: { info: PwaInfo } })
        .cyclePwa;
      if (client) setInfo({ ...client.info });
    };
    read();
    window.addEventListener("cycle-pwa", read);
    return () => window.removeEventListener("cycle-pwa", read);
  }, []);
  async function persistence() {
    try {
      if (!navigator.storage?.persist) {
        setStorage("此浏览器不提供持久存储申请；请定期导出备份。");
        return;
      }
      const ok = await navigator.storage.persist();
      setStorage(
        ok
          ? "浏览器已允许持久存储，仍请定期备份。"
          : "浏览器未允许持久存储，数据仍可保存，但可能被系统清理。",
      );
    } catch {
      setStorage("无法申请持久存储，请定期备份。");
    }
  }
  function update() {
    const client = (
      window as Window & { cyclePwa?: { applyUpdate: () => void } }
    ).cyclePwa;
    client?.applyUpdate();
  }
  return (
    <Card>
      <AppText kind="heading">离线与更新</AppText>
      <AppText>{info.status}</AppText>
      {info.waiting && (
        <>
          <AppText kind="caption">
            先保存当前编辑并导出备份，再应用更新。更新只更换应用文件，不清除
            IndexedDB。
          </AppText>
          <Button title="已保存，应用更新并重新加载" onPress={update} />
        </>
      )}
      <Button
        secondary
        title="检查新版本"
        onPress={() => {
          void navigator.serviceWorker
            ?.getRegistration()
            .then((r) => r?.update())
            .catch(() =>
              setInfo({
                ...info,
                status: "检查失败；离线时可继续使用已缓存版本",
              }),
            );
        }}
      />
      <Button
        secondary
        title="申请浏览器持久存储"
        onPress={() => void persistence()}
      />
      {storage && <AppText kind="caption">{storage}</AppText>}
      <AppText kind="caption">
        用 Safari 打开 HTTPS 地址 → 分享 →
        添加到主屏幕。首次在线等待“离线外壳已就绪”后再断网测试。不要使用隐私浏览；清理站点数据会丢失未备份记录。
      </AppText>
    </Card>
  );
}
