import type { Entry, CycleData } from "./model.ts";
import { isDateKey } from "./dates.ts";
export function entryForDate(data: CycleData, date: string): Entry {
 if(!isDateKey(date))throw Error("日期无效");
 return {...(data.entries.find(e=>e.date===date) ?? {date,flow:"none",spotting:false,pain:0,fatigue:0,mood:"",note:""})};
}
export function dateSwitchNeedsConfirmation(draft: Entry, baseline: Entry, next: string): boolean {
 return next!==draft.date && JSON.stringify(draft)!==JSON.stringify(baseline);
}
