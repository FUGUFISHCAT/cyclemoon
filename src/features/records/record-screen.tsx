import { View } from "react-native";
import { entryForDate, dateSwitchNeedsConfirmation } from "@/domain/record-draft";
import { Sheet } from "@/components/sheet";
import { useDraftSave } from "@/store/use-draft-save";
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
  const [generation, reset] = useState(0);
  const queryDate = useSessionStore((s) => s.selectedDate);
  const ready = useDataStore((s) => s.ready);
  if (!ready)
    return (
      <Screen title="记录" subtitle="正在准备本地数据">
        <DataStatus />
      </Screen>
    );
  const date = isDateKey(queryDate) ? queryDate : localToday();
  return <RecordForm key={date + generation} initialDate={date} onReload={() => reset(v => v + 1)} />;
}
function RecordForm({ initialDate, onReload, panel }: { initialDate: string; onReload: () => void; panel?: {visible:boolean;onClose:()=>void} }) {
  const {
    snapshot: { data },
    ready,
    busy,
  } = useDataStore();
  const save = useDraftSave();
  const [sheet, setSheet] = useState<"period" | "body" | null>("body");
  const initialPeriod=data.periods.find(p=>p.end?initialDate>=p.start&&initialDate<=p.end:initialDate===p.start);
  const [endPending,setEndPending]=useState(initialPeriod?.endPending===true);
  const initial = entryForDate(data,initialDate);
  const [baseline,setBaseline]=useState(initial);
  const [pendingDate,setPendingDate]=useState<string|null>(null);
  const [closing,setClosing]=useState(false);
  const [start, setStart] = useState(initialPeriod?.start ?? initialDate),
    [end, setEnd] = useState(initialPeriod?.end ?? ""),
    [editing, setEditing] = useState<string | null>(initialPeriod?.id ?? null);
  const [entryDate, setEntryDate] = useState(initialDate),
    [flow, setFlow] = useState<Entry["flow"]>(initial?.flow ?? "none"),
    [spotting, setSpotting] = useState(initial?.spotting ?? false);
  const [pain, setPain] = useState(String(initial?.pain ?? 0)),
    [fatigue, setFatigue] = useState(String(initial?.fatigue ?? 0)),
    [mood, setMood] = useState(initial?.mood ?? ""),
    [note, setNote] = useState(initial?.note ?? "");
  const [periodBaseline,setPeriodBaseline]=useState(JSON.stringify({start,end,editing,endPending}));
  const [feedback, setFeedback] = useState(""),
    [deleting, setDeleting] = useState<string | null>(null);
  const draft: Entry={date:entryDate,flow,spotting,pain:Number(pain),fatigue:Number(fatigue),mood,note};
  function switchDate(date:string){if(!isDateKey(date)||date===entryDate)return;if(dateSwitchNeedsConfirmation(draft,baseline,date))setPendingDate(date);else loadEntry(date);}
  function loadEntry(date: string) {
    setBaseline(entryForDate(data,date));
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
            { id, start, end: end || null, ...(endPending?{endPending:true as const}:{}) },
          ],
        })
      ) {
        setFeedback("经期已保存到此设备");
        setPeriodBaseline(JSON.stringify({start,end:"",editing:null,endPending:false}));
        setEditing(null);
        setEnd("");
        setEndPending(false);
        setSheet(null);
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
      ) {
        setBaseline(entry);
        setFeedback("身体记录已保存到此设备");
        setSheet(null);
      }
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
    <RecordContainer panel={panel} onClose={()=>{if(JSON.stringify(draft)!==JSON.stringify(baseline)||JSON.stringify({start,end,editing,endPending})!==periodBaseline)setClosing(true);else panel?.onClose();}}>
      {closing && <Card><AppText>关闭将放弃未保存内容。</AppText><Button title="放弃草稿并关闭" onPress={()=>{setClosing(false);panel?.onClose();onReload();}}/><Button secondary title="继续编辑" onPress={()=>setClosing(false)}/></Card>}
      <DataStatus />
      <Button secondary title="放弃草稿并载入最新记录" onPress={onReload} />
      {feedback && <Notice>{feedback}</Notice>}
      <Button title="记经期开始 / 编辑日期" disabled={busy} onPress={() => setSheet("period")} />
      <Button secondary title="记身体与心情" disabled={busy} onPress={() => setSheet("body")} />
      {sheet === "period" && <View style={{gap:16}}>
      <DataStatus />{feedback && <Notice>{feedback}</Notice>}
      <Card>
        <AppText kind="heading">
          {editing ? "编辑经期" : "记录一次经期"}
        </AppText>
        {!editing && <Button secondary title="使用今天作为开始日" onPress={() => setStart(localToday())} />}
        <Field dateInput label="开始日期 YYYY-MM-DD" value={start} onChange={setStart} />
        <Field
          dateInput
          label="结束日期 YYYY-MM-DD（进行中请留空）"
          value={end}
          onChange={setEnd}
        />
        <Toggle label="结束日期不确定，保留待确认（日期留空）" value={endPending} onChange={setEndPending}/>
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
      </View>}
      {sheet === "body" && <View style={{gap:16}}>
      <DataStatus />{feedback && <Notice>{feedback}</Notice>}
      <Card>
        <AppText kind="heading">身体与心情</AppText>
        <Field
          dateInput
          label="身体记录日期 YYYY-MM-DD"
          value={entryDate}
          onChange={switchDate}
        />
        {pendingDate && <Card><AppText>切换日期将放弃当前未保存内容。</AppText><Button title="放弃草稿并切换日期" onPress={()=>{loadEntry(pendingDate);setPendingDate(null);}}/><Button secondary title="保留当前草稿" onPress={()=>setPendingDate(null)}/></Card>}
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
      </View>}
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
              {p.start} → {p.end ?? (p.endPending ? "结束日期待确认" : "进行中")}
            </AppText>
            <Button
              secondary
              title={"编辑 " + p.start + " 经期"}
              onPress={() => {
                setPeriodBaseline(JSON.stringify({start:p.start,end:p.end??"",editing:p.id,endPending:p.endPending===true}));
                setEditing(p.id);
                setStart(p.start);
                setEnd(p.end ?? "");
                setEndPending(p.endPending===true);
                setSheet("period");
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
                  switchDate(e.date);
                  setSheet("body");
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
    </RecordContainer>
  );
}

function RecordContainer({panel,onClose,children}: React.PropsWithChildren<{panel?:{visible:boolean;onClose:()=>void};onClose:()=>void}>){return panel?<Sheet visible={panel.visible} onClose={onClose}>{children}</Sheet>:<Screen title="记录" subtitle="本地保存">{children}</Screen>;}
export function RecordPanel({date,visible,onClose}:{date:string;visible:boolean;onClose:()=>void}){const [generation,reset]=useState(0);const ready=useDataStore(s=>s.ready);return ready?<RecordForm key={date+generation} initialDate={date} onReload={()=>reset(v=>v+1)} panel={{visible,onClose}}/>:null;}
