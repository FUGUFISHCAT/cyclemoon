import test from "node:test";
import assert from "node:assert/strict";
import { IDBFactory, IDBObjectStore } from "fake-indexeddb";
import { createIndexedRepository } from "../src/data/indexeddb.ts";
import { emptyData } from "../src/domain/model.ts";
import { predict } from "../src/domain/prediction.ts";
import { fixture } from "./helpers.mjs";

test("QuotaExceededError 中止真实 IndexedDB 事务，恢复原快照且能再次保存",async()=>{
 const repo=createIndexedRepository(new IDBFactory(),"quota");
 const original=await repo.commit(fixture(),0);
 const put=IDBObjectStore.prototype.put;
 try {
  IDBObjectStore.prototype.put=function(){throw new DOMException("quota","QuotaExceededError");};
  await assert.rejects(()=>repo.commit(emptyData(),1),/quota/i);
 } finally {IDBObjectStore.prototype.put=put;}
 assert.deepEqual(await repo.load(),original);
 assert.equal((await repo.commit(fixture(),1)).revision,2);
});
test("未知旧库结构升级中止，不创建空数据库替代原数据",async()=>{
 const factory=new IDBFactory();
 await new Promise((resolve,reject)=>{
  const r=factory.open("unknown",1);
  r.onupgradeneeded=()=>r.result.createObjectStore("legacy");
  r.onerror=()=>reject(r.error);r.onsuccess=()=>{r.result.close();resolve();};
 });
 await assert.rejects(()=>createIndexedRepository(factory,"unknown").load(),/无法打开/);
 await new Promise((resolve,reject)=>{
  const r=factory.open("unknown",1);
  r.onerror=()=>reject(r.error);r.onsuccess=()=>{assert.ok(r.result.objectStoreNames.contains("legacy"));assert.equal(r.result.objectStoreNames.contains("state"),false);r.result.close();resolve();};
 });
});
test("未结束记录仅开始日属实；排卵经验范围随不规律性扩大",()=>{
 const data=fixture();data.periods[0].end=null;
 assert.match(predict(data,"2026-11-06").phase,/尚未确认结束/);
 const irregular=predict(data,"2026-11-13");
 data.profile.irregular=false;const regular=predict(data,"2026-11-13");
 assert.ok(irregular.ovulationFrom<regular.ovulationFrom);
 assert.ok(irregular.ovulationTo>regular.ovulationTo);
});
test("修改历史即时重算；支持日期上界时不崩溃或产生越界预测",()=>{
 const data=fixture(),before=predict(data,"2026-11-13");
 data.periods[0].start="2026-11-04";
 assert.notEqual(predict(data,"2026-11-13").next,before.next);
 data.periods=[{id:"boundary",start:"2199-12-25",end:null}];
 assert.equal(predict(data,"2199-12-26"),null);
});
