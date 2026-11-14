import { useDraftSave } from "@/store/use-draft-save";
import { emptyData } from "@/domain/model";
import { useState } from "react";
import { Platform } from "react-native";
import { AppText, Button, Card, Notice, Row, Screen } from "@/components/ui";
import { Field, Toggle } from "@/components/form";
import { DataStatus } from "@/components/data-status";
import { useDataStore } from "@/store/use-data-store";
import { exportBackup, importBackup } from "@/domain/backup";
import { exportIcs, planReminders } from "@/domain/reminders";
import { localToday } from "@/domain/dates";
import type { CycleData, ReminderKind } from "@/domain/model";
import { downloadText, pickBackup } from "@/services/files";
import { PwaStatus } from "@/services/pwa-status";
const reminderLabels: Record<ReminderKind, string> = {
  period: "预计月经开始",
  prepare: "预计前三天准备",
  "period-check": "预计开始次日确认",
  "record-check": "经期结束与记录确认",
};
export default function SettingsScreen() {
  const [generation, reset] = useState(0);
  const [result, setResult] = useState("");
  const ready = useDataStore((s) => s.ready);
  return ready ? (
    <SettingsForm key={generation} initialMessage={result} onReload={(message = "") => {setResult(message); reset(v => v + 1);}} />
  ) : (
    <Screen title="设置" subtitle="正在准备本地数据">
      <DataStatus />
    </Screen>
  );
}
function SettingsForm({onReload, initialMessage}: {onReload: (message?: string) => void; initialMessage: string}) {
  const {
    snapshot: { data },
    ready,
    busy,
  } = useDataStore();
  const save = useDraftSave();
  const [clearText, setClearText] = useState("");
  const [icsAgain, setIcsAgain] = useState(false);
  const [cycle, setCycle] = useState(
      data.profile ? String(data.profile.cycleDays) : "",
    ),
    [duration, setDuration] = useState(
      data.profile ? String(data.profile.periodDays) : "",
    ),
    [irregular, setIrregular] = useState(data.profile?.irregular ?? false);
  const [hour, setHour] = useState(String(data.reminders.hour)),
    [minute, setMinute] = useState(String(data.reminders.minute)),
    [privacy, setPrivacy] = useState(data.reminders.privacy),
    [enabled, setEnabled] = useState(data.reminders.enabled);
  const [message, setMessage] = useState(initialMessage),
    [pending, setPending] = useState<CycleData | null>(null),
    [confirmation, setConfirmation] = useState("");
  const [reviewedRevision, setReviewedRevision] = useState(0);
  async function configure() {
    const ok = await save({
      ...data,
      profile: {
        cycleDays: Number(cycle),
        periodDays: Number(duration),
        irregular,
      },
    });
    setMessage(ok ? "周期参数已保存" : "参数未保存，请检查页面提示");
  }
  async function reminders() {
    const ok = await save({
      ...data,
      reminders: {
        hour: Number(hour),
        minute: Number(minute),
        privacy,
        enabled,
      },
    });
    setMessage(
      ok
        ? "提醒设置已保存；已导入的日历副本不会自动更新"
        : "设置未保存，请检查页面提示",
    );
  }
  function backup() {
    try {
      downloadText(
        "cycle-backup-" + localToday() + ".json",
        exportBackup(data),
        "application/json;charset=utf-8",
      );
      setMessage("已交给浏览器下载。请确认文件保存到“文件”App，并妥善保管。");
    } catch (e) {
      setMessage(String(e));
    }
  }
  async function prepareRestore() {
    setPending(null);
    setConfirmation("");
    try {
      const source = await pickBackup();
      if (source !== null) {
        setPending(importBackup(source));
        setReviewedRevision(useDataStore.getState().snapshot.revision);
        setConfirmation("");
        setMessage("备份校验通过，请核对下方恢复预览");
      }
    } catch (e) {
      setMessage("无法恢复：" + (e instanceof Error ? e.message : "文件错误"));
    }
  }
  async function restore() {
    if (confirmation !== "恢复") return;
    if (useDataStore.getState().snapshot.revision !== reviewedRevision) {
      setMessage("预览后本地数据已变化，请取消并重新选择备份");
      return;
    }
    if (pending && (await useDataStore.getState().save(pending, reviewedRevision))) {
      setCycle(pending.profile ? String(pending.profile.cycleDays) : "");
      setDuration(pending.profile ? String(pending.profile.periodDays) : "");
      setIrregular(pending.profile?.irregular ?? false);
      setHour(String(pending.reminders.hour));
      setMinute(String(pending.reminders.minute));
      setPrivacy(pending.reminders.privacy);
      setEnabled(pending.reminders.enabled);
      setPending(null);
      setMessage("已原子恢复全部记录与设置。请重新生成并导入日历副本。");
      onReload("已恢复全部记录与设置。请重新生成并导入日历副本。");
    }
  }
  function ics() {
    try {
      if (!planReminders(data, localToday()).length) {
        setMessage("暂无未来提醒。请先保存经期记录、周期参数和提醒开关。");
        return;
      }
      if (icsAgain && Platform.OS === "web" && !window.confirm("你已在本次打开中导出过提醒。重复导入可能产生重复事件；已处理旧日历事件？")) return;
      setIcsAgain(true);
      downloadText(
        "cycle-reminders-" + localToday() + ".ics",
        exportIcs(data, localToday()),
        "text/calendar;charset=utf-8",
      );
      setMessage(
        "已交给浏览器导出 ICS。请用日历 App 导入，并核对提醒是否保留。",
      );
    } catch (e) {
      setMessage(String(e));
    }
  }
  return (
    <Screen title="设置" subtitle="本地保存，自己掌握。">
      <DataStatus />
      <Button secondary title="放弃设置草稿并载入最新数据" onPress={() => onReload()} />
      {message && <Notice>{message}</Notice>}
      <Card>
        <AppText kind="heading">我的周期参数</AppText>
        <Field
          label="典型周期天数（15–90）"
          value={cycle}
          onChange={setCycle}
          numeric
        />
        <Field
          label="经期天数（1–20）"
          value={duration}
          onChange={setDuration}
          numeric
        />
        <Toggle
          label="周期不太规律"
          value={irregular}
          onChange={setIrregular}
        />
        <Button
          title="保存周期参数"
          disabled={!ready || busy}
          onPress={() => void configure()}
        />
      </Card>
      <Card>
        <AppText kind="heading">日历提醒</AppText>
        <Field
          label="提醒小时（0–23，本地时间）"
          value={hour}
          onChange={setHour}
          numeric
        />
        <Field
          label="提醒分钟（0–59）"
          value={minute}
          onChange={setMinute}
          numeric
        />
        <Toggle
          label="隐私文案：日历只显示“个人日程提醒”"
          value={privacy}
          onChange={setPrivacy}
        />
        {(Object.keys(reminderLabels) as ReminderKind[]).map((kind) => (
          <Toggle
            key={kind}
            label={reminderLabels[kind]}
            value={enabled[kind]}
            onChange={(v) => setEnabled({ ...enabled, [kind]: v })}
          />
        ))}
        <Button
          title="保存提醒设置"
          disabled={!ready || busy}
          onPress={() => void reminders()}
        />
        <AppText kind="caption">
          下列预览使用已保存的参数。预计经期结束后确认记录；进行中的经期另生成一次确认。只导出当前与下一轮，过期事件跳过。
        </AppText>
        {planReminders(data, localToday()).map((r) => (
          <Row key={r.id} label={r.date} value={r.title} />
        ))}
        <Notice>
          ICS 是一次性副本，导入后不会因 PWA
          数据改变而自动更新。重新导入前，请在日历中处理旧事件，避免重复。日历可能同步至
          iCloud 等账户；建议选择单独日历并保留隐私文案。实际提醒由日历 App
          决定，本 App 没有真正的 iOS 本地通知。
        </Notice>
        <Button
          title="导出 ICS 日历文件"
          disabled={!ready || busy}
          onPress={ics}
        />
      </Card>
      <Card>
        <AppText kind="heading">数据备份与恢复</AppText>
        <AppText>
          JSON
          备份包含敏感健康记录，未加密。只保存到你信任的位置，勿上传公开服务器或发送给他人。浏览器数据可能因空间不足、清理站点数据或卸载而丢失，请定期备份。
        </AppText>
        <Button
          title="导出敏感数据备份 JSON"
          disabled={!ready || busy}
          onPress={backup}
        />
        <Button
          secondary
          title="选择备份并预览恢复"
          disabled={!ready || busy}
          onPress={() => void prepareRestore()}
        />
        {pending && (
          <Card tinted>
            <AppText kind="heading">恢复预览</AppText>
            <AppText kind="caption">未加密备份；以下为校验后的内容。未来版本、无效字段或冲突区间会拒绝恢复。</AppText>
            <Row label="周期参数" value={pending.profile ? `${pending.profile.cycleDays} 天 / 经期 ${pending.profile.periodDays} 天 / ${pending.profile.irregular ? "不太规律" : "较规律"}` : "未设置"} />
            <Row label="经期记录范围" value={pending.periods.length ? `${pending.periods[0].start} 至 ${pending.periods.at(-1)!.start}` : "无经期记录"} />
            <Row label="提醒时间（本地）" value={`${pending.reminders.hour.toString().padStart(2,"0")}:${pending.reminders.minute.toString().padStart(2,"0")}`} />
            <Row
              label="将恢复经期 / 身体记录"
              value={
                pending.periods.length +
                " 条 / " +
                pending.entries.length +
                " 天"
              }
            />
            <Row
              label="当前经期 / 身体记录"
              value={
                data.periods.length + " 条 / " + data.entries.length + " 天"
              }
            />
            <AppText>
              恢复会覆盖此设备现有记录及参数。请先导出当前备份；不会合并，不会上传。
            </AppText>
            <Field
              label="输入“恢复”以确认覆盖"
              value={confirmation}
              onChange={setConfirmation}
            />
            <Button
              title="确认覆盖并恢复"
              disabled={confirmation !== "恢复" || busy}
              onPress={() => void restore()}
            />
            <Button
              secondary
              title="取消恢复"
              onPress={() => setPending(null)}
            />
          </Card>
        )}
        <AppText kind="caption">
          {Platform.OS === "web"
            ? "存储：IndexedDB；未实现应用级加密。"
            : "原生 SQLite 和文件适配尚未启用。"}{" "}
          未接入广告、云同步或分析 SDK。
        </AppText>
      </Card>
      <Card>
        <AppText kind="heading">隐私与清除本机记录</AppText>
        <AppText>无登录、无广告和第三方健康分析；记录只写入本机数据库。JSON 未加密，ICS 可能同步到你的日历账户。清除浏览器数据、卸载或换域名可能使记录不可用，请定期备份。</AppText>
        <Field label="清除前请备份；输入“清除本机记录”" value={clearText} onChange={setClearText}/>
        <Button secondary title="确认清除本机记录与设置" disabled={busy || clearText !== "清除本机记录"} onPress={() => void (async () => {
          if (await save(emptyData())) useDataStore.getState().discardDrafts();
        })()}/>
        <AppText kind="caption">仅清除此站点数据库内的记录与参数，不会删除下载的备份或已导入的日历事件。</AppText>
      </Card>
      <PwaStatus />
      <Card>
        <Row label="版本" value="0.3.0 · PWA 本地版" />
        <Row label="外观" value="跟随系统" />
      </Card>
    </Screen>
  );
}
