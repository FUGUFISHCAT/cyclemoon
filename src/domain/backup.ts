import type {
  CycleData,
  Snapshot,
  Period,
  Entry,
  Profile,
  Reminders,
} from "./model.ts";
import { defaultReminders } from "./model.ts";
import { dayNumber, isDateKey } from "./dates.ts";

function object(v: unknown): Record<string, unknown> {
  if (!v || typeof v !== "object" || Array.isArray(v))
    throw new Error("数据格式错误");
  return v as Record<string, unknown>;
}
function text(v: unknown, limit: number): string {
  if (typeof v !== "string" || v.length > limit)
    throw new Error("文本格式或长度错误");
  return v;
}
function integer(v: unknown, min: number, max: number): number {
  if (!Number.isInteger(v) || (v as number) < min || (v as number) > max)
    throw new Error("数值超出允许范围");
  return v as number;
}
function bool(v: unknown): boolean {
  if (typeof v !== "boolean") throw new Error("开关格式错误");
  return v;
}
function date(v: unknown): string {
  if (!isDateKey(v)) throw new Error("无效日历日期");
  return v;
}
export function validateData(raw: unknown): CycleData {
  const v = object(raw);
  let profile: Profile | null = null;
  if (v.profile !== null) {
    const p = object(v.profile);
    profile = {
      cycleDays: integer(p.cycleDays, 15, 90),
      periodDays: integer(p.periodDays, 1, 20),
      irregular: bool(p.irregular),
    };
    if (profile.periodDays >= profile.cycleDays)
      throw new Error("经期天数应小于周期天数");
  }
  if (
    !Array.isArray(v.periods) ||
    v.periods.length > 3000 ||
    !Array.isArray(v.entries) ||
    v.entries.length > 20000
  )
    throw new Error("记录数量或格式错误");
  const periods: Period[] = v.periods
    .map((raw) => {
      const p = object(raw);
      const id = text(p.id, 100);
      if (!/^[a-zA-Z0-9_-]{1,100}$/.test(id)) throw new Error("记录 ID 无效");
      const start = date(p.start),
        end = p.end === null ? null : date(p.end);
      if (
        end &&
        (dayNumber(end) < dayNumber(start) ||
          dayNumber(end) - dayNumber(start) > 60)
      )
        throw new Error("经期结束日期或跨度无效");
      return { id, start, end };
    })
    .sort((a, b) => a.start.localeCompare(b.start));
  if (new Set(periods.map((p) => p.id)).size !== periods.length)
    throw new Error("经期 ID 重复");
  for (let i = 1; i < periods.length; i++) {
    const prev = periods[i - 1];
    if (prev.end === null || prev.end >= periods[i].start)
      throw new Error("经期区间重叠；请先结束上一条进行中的记录");
  }
  const entries: Entry[] = v.entries
    .map((raw) => {
      const e = object(raw),
        flow = e.flow;
      if (!["none", "light", "medium", "heavy"].includes(String(flow)))
        throw new Error("流量格式错误");
      return {
        date: date(e.date),
        flow: flow as Entry["flow"],
        spotting: bool(e.spotting),
        pain: integer(e.pain, 0, 3),
        fatigue: integer(e.fatigue, 0, 3),
        mood: text(e.mood, 30),
        note: text(e.note, 2000),
      };
    })
    .sort((a, b) => a.date.localeCompare(b.date));
  if (new Set(entries.map((e) => e.date)).size !== entries.length)
    throw new Error("同日身体记录重复");
  const r = object(v.reminders),
    enabled = object(r.enabled);
  const reminders: Reminders = {
    hour: integer(r.hour, 0, 23),
    minute: integer(r.minute, 0, 59),
    privacy: bool(r.privacy),
    enabled: {
      period: bool(enabled.period),
      prepare: bool(enabled.prepare),
      "period-check": bool(enabled["period-check"]),
      "record-check": bool(enabled["record-check"]),
    },
  };
  const data = { profile, periods, entries, reminders };
  if (new TextEncoder().encode(JSON.stringify(data)).length > 1024 * 1024)
    throw new Error(
      "本地记录已超过 1 MB 安全容量，请先导出备份，勿清除站点数据",
    );
  return data;
}
export function decodeSnapshot(raw: unknown): Snapshot {
  const v = object(raw);
  if (v.schemaVersion !== 1 && v.schemaVersion !== 2)
    throw new Error(
      "数据库版本不受支持。请保留数据并使用兼容版本，切勿清除站点数据",
    );
  const rawData = object(v.data);
  // v1 stored the same periods/entries/profile but did not have reminders.
  const data = validateData(
    v.schemaVersion === 1
      ? { ...rawData, reminders: rawData.reminders ?? defaultReminders() }
      : rawData,
  );
  return {
    schemaVersion: 2,
    revision: integer(v.revision, 0, Number.MAX_SAFE_INTEGER),
    data,
  };
}
export function exportBackup(data: CycleData, now = new Date()): string {
  return JSON.stringify({
    app: "CycleMoonBackup",
    schemaVersion: 2,
    exportedAt: now.toISOString(),
    data: validateData(data),
  });
}
export function importBackup(source: string): CycleData {
  if (new TextEncoder().encode(source).length > 2 * 1024 * 1024)
    throw new Error("备份超过 2 MB 上限");
  const v = object(JSON.parse(source));
  if (
    v.app !== "CycleMoonBackup" ||
    (v.schemaVersion !== 1 && v.schemaVersion !== 2)
  )
    throw new Error("不是支持的月相备份或版本过新");
  if (
    typeof v.exportedAt !== "string" ||
    !Number.isFinite(Date.parse(v.exportedAt))
  )
    throw new Error("备份时间无效");
  return decodeSnapshot({
    schemaVersion: v.schemaVersion,
    revision: 0,
    data: v.data,
  }).data;
}
