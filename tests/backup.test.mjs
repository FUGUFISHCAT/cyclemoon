import test from "node:test";
import assert from "node:assert/strict";
import {
  exportBackup,
  importBackup,
  validateData,
  decodeSnapshot,
} from "../src/domain/backup.ts";
import { fixture } from "./helpers.mjs";
test("v3 备份声明版本和未加密状态；兼容 v2，拒绝缺字段和加密冒充", () => {
 const v3=JSON.parse(exportBackup(fixture()));
 assert.equal(v3.schemaVersion,3); assert.equal(v3.appVersion,"0.4.0"); assert.equal(v3.encrypted,false);
 assert.ok(v3.cycleRecords && v3.dailyLogs && v3.preferences);
 assert.deepEqual(importBackup(JSON.stringify({app:"CycleMoonBackup",schemaVersion:2,exportedAt:new Date().toISOString(),data:fixture()})),fixture());
 assert.throws(()=>importBackup(JSON.stringify({...v3,encrypted:true})));
 assert.throws(()=>importBackup(JSON.stringify({...v3,preferences:{}})));
});
test("完整备份往返保留中文、emoji、换行、记录、参数与提醒", () => {
  const data = fixture();
  data.reminders.hour = 22;
  data.reminders.minute = 45;
  data.reminders.privacy = false;
  data.reminders.enabled.prepare = false;
  assert.deepEqual(
    importBackup(exportBackup(data, new Date("2026-11-13T00:00:00Z"))),
    data,
  );
});
test("畸形、未知版本、重复、重叠和无效日期拒绝导入", () => {
  assert.throws(() => importBackup("{"));
  const source = JSON.parse(exportBackup(fixture()));
  source.schemaVersion = 999;
  assert.throws(() => importBackup(JSON.stringify(source)));
  const duplicate = fixture();
  duplicate.periods.push({ ...duplicate.periods[0] });
  assert.throws(() => validateData(duplicate));
  const overlap = fixture();
  overlap.periods.push({
    id: "overlap",
    start: "2026-11-08",
    end: "2026-11-12",
  });
  assert.throws(() => validateData(overlap));
  const invalid = fixture();
  invalid.entries[0].date = "2026-02-30";
  assert.throws(() => validateData(invalid));
  const duplicateEntry = fixture();
  duplicateEntry.entries.push({ ...duplicateEntry.entries[0] });
  assert.throws(() => validateData(duplicateEntry));
});
test("v1 升级保留记录，只补充提醒设置；未来版本拒绝且不修改源对象", () => {
  const old = { schemaVersion: 1, revision: 7, data: fixture() };
  delete old.data.reminders;
  const raw = structuredClone(old);
  const migrated = decodeSnapshot(old);
  assert.equal(migrated.revision, 7);
  assert.deepEqual(migrated.data.periods, old.data.periods);
  assert.equal(migrated.data.reminders.privacy, true);
  assert.deepEqual(old, raw);
  assert.throws(() => decodeSnapshot({ ...old, schemaVersion: 99 }));
});
test("超大备份拒绝，安全保存容量内的数据必可导出恢复", () => {
  assert.throws(() => importBackup("x".repeat(2 * 1024 * 1024 + 1)));
  const d = fixture();
  d.entries[0].note = "🌓".repeat(500);
  assert.deepEqual(importBackup(exportBackup(d)), d);
});
