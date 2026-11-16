import test from "node:test";
import assert from "node:assert/strict";
import { IDBFactory } from "fake-indexeddb";
import { createIndexedRepository, DB_VERSION } from "../src/data/indexeddb.ts";
import { RevisionConflict } from "../src/data/repository.ts";
import { fixture } from "./helpers.mjs";
import { exportBackup, importBackup } from "../src/domain/backup.ts";

test("备份恢复经 Repository 落盘后完整回读，非只通过内存比较", async () => {
  const factory = new IDBFactory(),
    repo = createIndexedRepository(factory, "restore-integration");
  await repo.commit(fixture(), 0);
  const changed = fixture();
  changed.profile.cycleDays = 32;
  changed.reminders.minute = 25;
  changed.entries[0].note = "恢复后保留 中文 🌓";
  const imported = importBackup(exportBackup(changed));
  await repo.commit(imported, 1);
  const reopened = await createIndexedRepository(
    factory,
    "restore-integration",
  ).load();
  assert.deepEqual(reopened.data, changed);
  assert.equal(reopened.revision, 2);
});
function seed(factory, name, version, value) {
  return new Promise((resolve, reject) => {
    const r = factory.open(name, version);
    r.onupgradeneeded = () => r.result.createObjectStore("state");
    r.onerror = () => reject(r.error);
    r.onsuccess = () => {
      const db = r.result,
        tx = db.transaction("state", "readwrite");
      tx.objectStore("state").put(value, "root");
      tx.oncomplete = () => {
        db.close();
        resolve();
      };
      tx.onabort = () => reject(tx.error);
    };
  });
}
test("保存后用新的 Repository 读取，数据与版本完整持久化", async () => {
  const factory = new IDBFactory(),
    a = createIndexedRepository(factory, "persist");
  assert.equal((await a.load()).revision, 0);
  const saved = await a.commit(fixture(), 0);
  assert.equal(saved.revision, 1);
  assert.deepEqual(
    await createIndexedRepository(factory, "persist").load(),
    saved,
  );
});
test("非法恢复和冲突写入不改动已有记录；并发只有一次成功", async () => {
  const factory = new IDBFactory(),
    repo = createIndexedRepository(factory, "atomic");
  const saved = await repo.commit(fixture(), 0);
  const invalid = fixture();
  invalid.periods[0].end = "2026-01-01";
  await assert.rejects(() => repo.commit(invalid, 1));
  assert.deepEqual(await repo.load(), saved);
  await assert.rejects(() => repo.commit(fixture(), 0), RevisionConflict);
  assert.deepEqual(await repo.load(), saved);
  const outcomes = await Promise.allSettled([
    repo.commit(fixture(), 1),
    repo.commit(fixture(), 1),
  ]);
  assert.equal(outcomes.filter((r) => r.status === "fulfilled").length, 1);
  assert.equal((await repo.load()).revision, 2);
});
test("v1 数据库升级不清空旧记录", async () => {
  const factory = new IDBFactory(),
    data = fixture();
  delete data.reminders;
  await seed(factory, "upgrade", 1, { schemaVersion: 1, revision: 8, data });
  const result = await createIndexedRepository(factory, "upgrade").load();
  assert.equal(result.schemaVersion, 3);
  assert.equal(result.revision, 8);
  assert.deepEqual(result.data.periods, data.periods);
});
test("未来数据版本拒绝读写，旧内容仍在原库", async () => {
  const factory = new IDBFactory(),
    original = { schemaVersion: 99, revision: 4, data: fixture() };
  await seed(factory, "future", DB_VERSION, original);
  const repo = createIndexedRepository(factory, "future");
  await assert.rejects(() => repo.load());
  await assert.rejects(() => repo.commit(fixture(), 4));
  const stored = await new Promise((resolve, reject) => {
    const r = factory.open("future", DB_VERSION);
    r.onsuccess = () => {
      const db = r.result,
        tx = db.transaction("state");
      const get = tx.objectStore("state").get("root");
      get.onsuccess = () => resolve(get.result);
      tx.oncomplete = () => db.close();
    };
    r.onerror = () => reject(r.error);
  });
  assert.deepEqual(stored, original);
});
test("比当前更高的数据库版本不能降级或自动重建", async () => {
  const factory = new IDBFactory();
  await seed(factory, "db-future", DB_VERSION + 1, {
    schemaVersion: 2,
    revision: 1,
    data: fixture(),
  });
  await assert.rejects(
    () => createIndexedRepository(factory, "db-future").load(),
    /无法打开/,
  );
});
