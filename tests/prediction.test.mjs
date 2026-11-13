import test from "node:test";
import assert from "node:assert/strict";
import { predict } from "../src/domain/prediction.ts";
import { addDays, daysBetween, isDateKey } from "../src/domain/dates.ts";
import { emptyData } from "../src/domain/model.ts";
import { fixture } from "./helpers.mjs";
test("空记录或缺少历史与参数时不伪造预测", () => {
  assert.equal(predict(emptyData(), "2026-11-13"), null);
  const d = fixture();
  d.profile = null;
  assert.equal(predict(d, "2026-11-13"), null);
});
test("指定样例：30天周期、不规律，给出经验范围而非准确率", () => {
  const p = predict(fixture(), "2026-11-13");
  assert.equal(p.next, "2026-12-05");
  assert.equal(p.cycleDay, 9);
  assert.equal(p.earliest, "2026-11-28");
  assert.equal(p.latest, "2026-12-12");
  assert.equal(p.overdue, false);
  assert.match(p.basis, /历史不足/);
  assert.equal("accuracy" in p, false);
});
test("有效历史采用中位数，异常间隔排除并披露", () => {
  const d = fixture();
  d.periods = [
    { id: "a", start: "2026-01-01", end: "2026-01-05" },
    { id: "b", start: "2026-01-31", end: "2026-02-04" },
    { id: "c", start: "2026-03-02", end: "2026-03-06" },
    { id: "d", start: "2026-06-15", end: "2026-06-19" },
  ];
  const p = predict(d, "2026-06-20");
  assert.equal(p.cycleDays, 30);
  assert.equal(p.excluded, 1);
  assert.match(p.basis, /2 个有效/);
});
test("逾期保留原估计，不自动滚动到未来", () => {
  const p = predict(fixture(), "2027-01-10");
  assert.equal(p.next, "2026-12-05");
  assert.equal(p.overdue, true);
  assert.match(p.phase, /不确定/);
});
test("进行中超出估计经期时，不声称阶段确定", () => {
  const d = fixture();
  d.periods[0].end = null;
  assert.match(predict(d, "2026-11-20").phase, /不确定/);
});
test("未来记录不改变今天预测；相同输入可重复计算", () => {
  const d = fixture();
  d.periods.push({ id: "future", start: "2027-01-01", end: "2027-01-05" });
  assert.deepEqual(predict(d, "2026-11-13"), predict(fixture(), "2026-11-13"));
});
test("历史跨度较大时，经验范围覆盖历史偏差并保持日期顺序", () => {
  const d = fixture();
  d.profile.irregular = false;
  d.periods = [];
  let start = "2026-01-01";
  for (const [i, gap] of [28, 28, 45, 28].entries()) {
    d.periods.push({ id: "p" + i, start, end: addDays(start, 4) });
    start = addDays(start, gap);
  }
  d.periods.push({ id: "last", start, end: addDays(start, 4) });
  const p = predict(d, addDays(start, 5));
  assert.equal(p.cycleDays, 28);
  assert.ok(daysBetween(start, p.latest) >= 45);
  assert.ok(p.earliest <= p.next && p.next <= p.latest);
});
test("日历日运算跨闰日和跨年，不受本地时区毫秒偏移影响", () => {
  assert.equal(addDays("2028-02-28", 1), "2028-02-29");
  assert.equal(addDays("2026-12-31", 1), "2027-01-01");
  assert.equal(daysBetween("2026-03-07", "2026-03-09"), 2);
  assert.equal(isDateKey("2026-02-29"), false);
  assert.equal(isDateKey("2028-02-29"), true);
  assert.throws(() => daysBetween("garbage", "2026-01-01"));
});
