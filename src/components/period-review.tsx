import { useState } from "react";
import { AppText, Button, Card, Notice } from "./ui";
import { Field, Toggle } from "./form";
import { useDataStore } from "@/store/use-data-store";
import { needsReview, reviewPeriod } from "@/domain/period-review";
import { localToday } from "@/domain/dates";
import { createPeriodId } from "@/domain/record-id";
export function PeriodReview() {
 const {snapshot:{data,revision},busy,save}=useDataStore();
 const [mode,setMode]=useState<"end"|"new"|null>(null),[end,setEnd]=useState(""),[pending,setPending]=useState(false),[error,setError]=useState("");
 const today=localToday(),old=data.periods.find(p=>needsReview(p,today));
 if(!old)return data.periods.some(p=>p.endPending)?<Notice>有历史经期结束日期待确认，可在记录页面补填。</Notice>:null;
 async function confirm(){try{
  const next=reviewPeriod(data,old!.id,end||null,pending,today,mode==="new"?createPeriodId():undefined);
  if(await save(next,revision)){setMode(null);setEnd("");setPending(false);}
 }catch(e){setError(e instanceof Error?e.message:"保存失败");}}
 return <Card tinted>
  <AppText kind="heading">上次经期已超过14天未确认结束</AppText>
  <AppText>请核对 {old.start} 的记录。不会自动延长到今天。如果实际出血持续或伴有不适，请咨询专业医疗人员。</AppText>
  <Button title="补填上次结束日期" onPress={()=>setMode("end")}/>
  <Button secondary title="今天开始新经期" onPress={()=>setMode("new")}/>
  {mode && <>
   <AppText>先确认上次结束状态；不知道准确日期可留空并标记待确认，之后在记录页面补填。</AppText>
   <Field dateInput label="上次结束日期（不确定请留空）" value={end} onChange={setEnd}/>
   <Toggle label="不知道准确结束日期，标记待确认" value={pending} onChange={setPending}/>
   {error && <AppText>{error}</AppText>}
   <Button title={mode==="new"?"确认旧记录状态并开始今天新经期":"确认保存上次结束状态"} disabled={busy} onPress={()=>void confirm()}/>
   <Button secondary title="取消核对，不修改记录" onPress={()=>setMode(null)}/>
  </>}
 </Card>;
}
