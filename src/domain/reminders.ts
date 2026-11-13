import type { CycleData, ReminderKind } from "./model.ts";
import { addDays } from "./dates.ts";
import { predict } from "./prediction.ts";

export type Reminder = {
  id: string;
  kind: ReminderKind;
  date: string;
  title: string;
};
export function planReminders(data: CycleData, today: string): Reminder[] {
  const p = predict(data, today);
  const result: Reminder[] = [];
  const add = (kind: ReminderKind, date: string, title: string, id: string) => {
    if (data.reminders.enabled[kind] && date >= today)
      result.push({
        kind,
        date,
        title: data.reminders.privacy ? "个人日程提醒" : title,
        id,
      });
  };
  if (p && !p.overdue) {
    add("period", p.next, "预计月经开始（估计）", "period-" + p.next);
    add(
      "prepare",
      addDays(p.next, -3),
      "准备经期用品（预计前三天）",
      "prepare-" + p.next,
    );
    add(
      "period-check",
      addDays(p.next, 1),
      "确认本次经期是否开始",
      "period-check-" + p.next,
    );
    add(
      "record-check",
      addDays(p.next, p.periodDays),
      "确认经期结束并补充身体记录",
      "record-check-predicted-" + p.next,
    );
  } else if (p) {
    // Never silently roll an overdue prediction into invented cycles.
    add(
      "period-check",
      today,
      "确认经期记录：预计日期已过",
      "period-check-" + p.next,
    );
  }
  const latest = [...data.periods]
    .filter((p) => p.start <= today)
    .sort((a, b) => b.start.localeCompare(a.start))[0];
  if (latest?.end === null) {
    const target = addDays(
      latest.start,
      p?.periodDays ?? data.profile?.periodDays ?? 5,
    );
    add(
      "record-check",
      target < today ? today : target,
      "确认经期是否结束并补充身体记录",
      "record-check-" + latest.id,
    );
  }
  return result.sort(
    (a, b) => a.date.localeCompare(b.date) || a.kind.localeCompare(b.kind),
  );
}
function escapeText(s: string): string {
  return s
    .replace(/\\/g, "\\\\")
    .replace(/\r?\n/g, "\\n")
    .replace(/;/g, "\\;")
    .replace(/,/g, "\\,");
}
export function foldLine(line: string): string {
  const encoder = new TextEncoder();
  let out = "",
    current = "",
    size = 0;
  for (const char of line) {
    const bytes = encoder.encode(char).length;
    if (size + bytes > 75) {
      out += current + "\r\n";
      current = " ";
      size = 1;
    }
    current += char;
    size += bytes;
  }
  return out + current;
}
export function exportIcs(
  data: CycleData,
  today: string,
  now = new Date(),
): string {
  const stamp = now
    .toISOString()
    .replace(/[-:]/g, "")
    .replace(/\.\d{3}Z$/, "Z");
  const time =
    String(data.reminders.hour).padStart(2, "0") +
    String(data.reminders.minute).padStart(2, "0") +
    "00";
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//CycleMoon//Local Calendar 1.0//ZH",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
  ];
  for (const r of planReminders(data, today)) {
    const start = r.date.replace(/-/g, "") + "T" + time;
    // Floating local time intentionally follows the importing calendar timezone.
    const endDate = new Date(
      Date.UTC(
        Number(r.date.slice(0, 4)),
        Number(r.date.slice(5, 7)) - 1,
        Number(r.date.slice(8, 10)),
        data.reminders.hour,
        data.reminders.minute + 15,
      ),
    );
    const end = endDate.toISOString().replace(/[-:]/g, "").slice(0, 15);
    lines.push(
      "BEGIN:VEVENT",
      "UID:" + r.id + "@cyclemoon.local",
      "DTSTAMP:" + stamp,
      "DTSTART:" + start,
      "DTEND:" + end,
      "SUMMARY:" + escapeText(r.title),
      "DESCRIPTION:" +
        escapeText(
          "月相日历副本；不会随 PWA 数据自动更新。预测不用于避孕。提醒依赖日历 App 权限与设置。",
        ),
      "STATUS:TENTATIVE",
      "TRANSP:TRANSPARENT",
      "BEGIN:VALARM",
      "ACTION:DISPLAY",
      "TRIGGER:PT0S",
      "DESCRIPTION:" + escapeText(r.title),
      "END:VALARM",
      "END:VEVENT",
    );
  }
  lines.push("END:VCALENDAR");
  return lines.map(foldLine).join("\r\n") + "\r\n";
}
