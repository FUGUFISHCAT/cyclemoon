import test from "node:test";
import assert from "node:assert/strict";
import { buildMonth, dateKey, shiftMonth } from "../src/domain/calendar.ts";

test("闰年二月保留29天，周一开头，整周补齐", () => {
  const cells = buildMonth(2028, 1);
  assert.equal(cells.length % 7, 0);
  assert.equal(cells.indexOf(1), 1);
  assert.equal(cells.filter((d) => d !== null).length, 29);
});
test("跨年切换与日期键不受 UTC 转换影响", () => {
  assert.deepEqual(shiftMonth(2026, 11, 1), { year: 2027, month: 0 });
  assert.deepEqual(shiftMonth(2026, 0, -1), { year: 2025, month: 11 });
  assert.equal(dateKey(2026, 10, 5), "2026-11-05");
});
test("周日开头的月份正确占位，覆盖30天", () => {
  const cells = buildMonth(2026, 10);
  assert.equal(cells.indexOf(1), 6);
  assert.equal(cells.length, 42);
  assert.equal(cells.filter((d) => d !== null).length, 30);
});
