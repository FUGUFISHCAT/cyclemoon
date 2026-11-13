import { useState } from "react";
import { useSessionStore } from "@/store/use-session-store";
import { AppText, Button, Card, Notice, Screen } from "@/components/ui";
import { Choices, Field, Toggle } from "@/components/form";
import { DataStatus } from "@/components/data-status";
import { useDataStore } from "@/store/use-data-store";
import { isDateKey, localToday } from "@/domain/dates";
import type { Entry } from "@/domain/model";

const flowOptions = [
  { value: "none", label: "无" },
  { value: "light", label: "少量" },
  { value: "medium", label: "中等" },
  { value: "heavy", label: "较多" },
];
const levelOptions = [
  { value: "0", label: "无" },
  { value: "1", label: "轻" },
  { value: "2", label: "中" },
  { value: "3", label: "重" },
];
export default function RecordScreen() {
  const queryDate = useSessionStore((s) => s.selectedDate);
  const ready = useDataStore((s) => s.ready);
  if (!ready)
    return (
      <Screen title="记录" subtitle="正在准备本地数据">
        <DataStatus />
      </Screen>
    );
  const date = isDateKey(queryDate) ? queryDate : localToday();
  return <RecordForm key={date} initialDate={date} />;
}
function RecordForm({ initialDate }: { initialDate: string }) {
  const {
    snapshot: { data },
    ready,
    busy,
    save,
  } = useDataStore();
  const initial = data.entries.find((e) => e.date === initialDate);
  const [start, setStart] = useState(initialDate),
    [end, setEnd] = useState(""),
    [editing, setEditing] = useState<string | null>(null);
  const [entryDate, setEntryDate] = useState(initialDate),
    [flow, setFlow] = useState<Entry["flow"]>(initial?.flow ?? "none"),
    [spotting, setSpotting] = useState(initial?.spotting ?? false);
  const [pain, setPain] = useState(String(initial?.pain ?? 0)),
    [fatigue, setFatigue] = useState(String(initial?.fatigue ?? 0)),
    [mood, setMood] = useState(initial?.mood ?? ""),
    [note, setNote] = useState(initial?.note ?? "");
  const [feedback, setFeedback] = useState(""),
    [deleting, setDeleting] = useState<string | null>(null);
  function loadEntry(date: string) {
    const e = data.entries.find((e) => e.date === date);
    setEntryDate(date);
    setFlow(e?.flow ?? "none");
    setSpotting(e?.spotting ?? false);
    setPain(String(e?.pain ?? 0));
    setFatigue(String(e?.fatigue ?? 0));
    setMood(e?.mood ?? "");
    setNote(e?.note ?? "");
  }
  async function savePeriod() {
    setFeedback("");
    try {
      if (!isDateKey(start) || (end && !isDateKey(end)))
        throw new Error("请填写有效日期，例如 2026-11-05");
      if (start > localToday() || (end && end > localToday()))
        throw new Error("真实经期记录不能填写未来日期");
      const id =
        editing ??
        "p_" +
          Date.now().toString(36) +
          "_" +
          Math.random().toString(36).slice(2, 10);
      if (
        await save({
          ...data,
          periods: [
            ...data.periods.filter((p) => p.id !== id),
            { id, start, end: end || null },
          ],
        })
      ) {
        setFeedback("经期已保存到此设备");
        setEditing(null);
        setEnd("");
      }
    } catch (e) {
      setFeedback(e instanceof Error ? e.message : "保存失败");
    }
  }
  async function saveEntry() {
    setFeedback("");
    try {
      if (!isDateKey(entryDate) || entryDate > localToday())
        throw new Error("身体记录日期无效或位于未来");
      const entry: Entry = {
        date: entryDate,
        flow,
        spotting,
        pain: Number(pain),
        fatigue: Number(fatigue),
        mood,
        note,
      };
      if (
        await save({
          ...data,
          entries: [...data.entries.filter((e) => e.date !== entryDate), entry],
        })
      )
        setFeedback("身体记录已保存到此设备");
    } catch (e) {
      setFeedback(e instanceof Error ? e.message : "保存失败");
    }
  }
  async function remove() {
    if (!deleting) return;
    const updated = deleting.startsWith("entry:")
      ? {
          ...data,
          entries: data.entries.filter((e) => e.date !== deleting.slice(6)),
        }
      : { ...data, periods: data.periods.filter((p) => p.id !== deleting) };
    if (await save(updated)) {
      setFeedback("记录已删除");
      setDeleting(null);
      setEditing(null);
    }
  }
  return (
    <Screen title="记录" subtitle="只存于此设备，离线也能记下今天。">
      <DataStatus />
      {feedback && <Notice>{feedback}</Notice>}
      <Card>
        <AppText kind="heading">
          {editing ? "编辑经期" : "记录一次经期"}
        </AppText>
        <Field label="开始日期 YYYY-MM-DD" value={start} onChange={setStart} />
        <Field
          label="结束日期 YYYY-MM-DD（进行中请留空）"
          value={end}
          onChange={setEnd}
        />
        <Button
          disabled={!ready || busy}
          title={editing ? "保存经期修改" : "保存经期"}
          onPress={() => void savePeriod()}
        />
        {editing && (
          <Button
            secondary
            title="取消经期编辑"
            onPress={() => {
              setEditing(null);
              setStart(localToday());
              setEnd("");
            }}
          />
        )}
      </Card>
      <Card>
        <AppText kind="heading">身体与心情</AppText>
        <Field
          label="身体记录日期 YYYY-MM-DD"
          value={entryDate}
          onChange={setEntryDate}
        />
        <Button
          secondary
          title="读取这一天的已有身体记录"
          disabled={!ready || busy}
          onPress={() => {
            if (isDateKey(entryDate)) loadEntry(entryDate);
            else setFeedback("请先填写有效日期");
          }}
        />
        <Choices
          label="流量"
          value={flow}
          options={flowOptions}
          onChange={(v) => setFlow(v as Entry["flow"])}
        />
        <Toggle label="点滴出血" value={spotting} onChange={setSpotting} />
        <Choices
          label="疼痛"
          value={pain}
          options={levelOptions}
          onChange={setPain}
        />
        <Choices
          label="疲劳"
          value={fatigue}
          options={levelOptions}
          onChange={setFatigue}
        />
        <Field label="心情（最多 30 字）" value={mood} onChange={setMood} />
        <Field
          label="备注（最多 2000 字）"
          value={note}
          onChange={setNote}
          multiline
        />
        <Button
          title="保存身体记录"
          disabled={!ready || busy}
          onPress={() => void saveEntry()}
        />
      </Card>
      {deleting && (
        <Card tinted>
          <AppText>确认永久删除这条记录？建议先在设置导出备份。</AppText>
          <Button
            title="确认删除这条记录"
            disabled={busy}
            onPress={() => void remove()}
          />
          <Button
            secondary
            title="保留记录"
            onPress={() => setDeleting(null)}
          />
        </Card>
      )}
      <Card>
        <AppText kind="heading">
          已保存的经期 · {data.periods.length} 条
        </AppText>
        {[...data.periods].reverse().map((p) => (
          <Card key={p.id}>
            <AppText>
              {p.start} → {p.end ?? "进行中"}
            </AppText>
            <Button
              secondary
              title={"编辑 " + p.start + " 经期"}
              onPress={() => {
                setEditing(p.id);
                setStart(p.start);
                setEnd(p.end ?? "");
                setFeedback("已载入经期，请在上方修改");
              }}
            />
            <Button
              secondary
              title={"删除 " + p.start + " 经期"}
              onPress={() => setDeleting(p.id)}
            />
          </Card>
        ))}
        {!data.periods.length && (
          <AppText kind="caption">还没有经期记录。</AppText>
        )}
      </Card>
      <Card>
        <AppText kind="heading">最近身体记录</AppText>
        {[...data.entries]
          .reverse()
          .slice(0, 30)
          .map((e) => (
            <Card key={e.date}>
              <AppText>
                {e.date} · {e.mood || "未填写心情"}
              </AppText>
              <AppText kind="caption">{e.note || "无备注"}</AppText>
              <Button
                secondary
                title={"编辑 " + e.date + " 身体记录"}
                onPress={() => {
                  loadEntry(e.date);
                  setFeedback("已载入身体记录，请在上方修改");
                }}
              />
              <Button
                secondary
                title={"删除 " + e.date + " 身体记录"}
                onPress={() => setDeleting("entry:" + e.date)}
              />
            </Card>
          ))}
      </Card>
    </Screen>
  );
}
