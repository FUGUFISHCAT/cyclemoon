import type { CycleData, Period } from "./model.ts";
import { daysBetween, isDateKey } from "./dates.ts";
import { validateData } from "./backup.ts";
export function needsReview(period: Period, today: string): boolean {
  return period.end === null && !period.endPending && daysBetween(period.start, today) + 1 > 14;
}
// Called only after the user confirms the old record's status. No guessed end.
export function reviewPeriod(data: CycleData, id: string, end: string | null, pending: boolean, today: string, newId?: string): CycleData {
 const old=data.periods.find(p=>p.id===id);
 if(!old || old.end!==null)throw new Error("记录已变化，请重新核对");
 if(!pending && (!isDateKey(end) || end<old.start || end>today))throw new Error("请填写有效的上次结束日期，或选择待确认");
 if(pending && end)throw new Error("待确认时请清空结束日期");
 if(newId && (old.start>=today || (end!==null && end>=today)))throw new Error("上次结束日期必须早于新经期开始日");
 return validateData({...data,periods:[...data.periods.map(p=>p.id===id?{id:p.id,start:p.start,end:pending?null:end,...(pending?{endPending:true as const}:{})}:p),...(newId?[{id:newId,start:today,end:null}]:[])]});
}
