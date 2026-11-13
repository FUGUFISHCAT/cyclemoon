import test from "node:test";
import assert from "node:assert/strict";
import { exportIcs, foldLine, planReminders } from "../src/domain/reminders.ts";
import { fixture } from "./helpers.mjs";
test("下一轮四类提醒与前三天日期，用户时间写入 ICS", () => {
  const d = fixture();
  d.reminders.hour = 22;
  d.reminders.minute = 45;
  const planned = planReminders(d, "2026-11-13");
  assert.equal(planned.length, 4);
  assert.equal(planned.find((e) => e.kind === "prepare").date, "2026-12-02");
  const ics = exportIcs(d, "2026-11-13", new Date("2026-11-13T00:00:00Z"));
  assert.match(ics, /DTSTART:20261202T224500/);
  assert.match(ics, /BEGIN:VALARM\r\nACTION:DISPLAY\r\nTRIGGER:PT0S/);
  assert.equal((ics.match(/BEGIN:VEVENT/g) || []).length, 4);
  assert.ok(ics.endsWith("END:VCALENDAR\r\n"));
  assert.match(ics.replace(/\r\n /g, ""), /不会随 PWA 数据自动更新/);
});
test("关闭提醒与过去日期跳过；逾期不制造新一轮预测", () => {
  const d = fixture();
  d.reminders.enabled.prepare = false;
  assert.ok(!planReminders(d, "2026-12-04").some((r) => r.kind === "prepare"));
  const late = planReminders(d, "2027-01-10");
  assert.equal(late.length, 1);
  assert.equal(late[0].kind, "period-check");
  assert.equal(late[0].date, "2027-01-10");
});
test("隐私标题不含健康事件，结束记录确认在进行中时额外生成", () => {
  const d = fixture();
  d.periods[0].end = null;
  const list = planReminders(d, "2026-11-13");
  assert.ok(list.every((r) => r.title === "个人日程提醒"));
  assert.ok(
    list.some((r) => r.kind === "record-check" && r.date === "2026-11-13"),
  );
  d.reminders.privacy = false;
  assert.ok(
    planReminders(d, "2026-11-13").some((r) => r.title.includes("经期")),
  );
});
test("UTF-8 折行不切断多字节字符，每行不超过75字节", () => {
  const line = "DESCRIPTION:" + "月相🌓;".repeat(50),
    folded = foldLine(line);
  assert.equal(folded.replace(/\r\n /g, ""), line);
  for (const part of folded.split("\r\n"))
    assert.ok(new TextEncoder().encode(part).length <= 75);
});
test("23:59 事件结束跨日与稳定UID，内容不会含原始备注", () => {
  const d = fixture();
  d.reminders.hour = 23;
  d.reminders.minute = 59;
  const ics = exportIcs(d, "2026-11-13");
  assert.match(ics, /DTSTART:20261202T235900\r\nDTEND:20261203T001400/);
  assert.ok(!ics.includes("非真实健康数据"));
  const again = exportIcs(d, "2026-11-13");
  assert.deepEqual(ics.match(/^UID:.+$/gm), again.match(/^UID:.+$/gm));
});
