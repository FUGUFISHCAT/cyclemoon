import test from "node:test";
import assert from "node:assert/strict";
import { fixture } from "./helpers.mjs";
import { needsReview, reviewPeriod } from "../src/domain/period-review.ts";
import { validateData, exportBackup, importBackup } from "../src/domain/backup.ts";
import { predict } from "../src/domain/prediction.ts";
import { shareOrDownload, exportMessage } from "../src/services/share-file.ts";
import { IDBFactory } from "fake-indexeddb";
import { createIndexedRepository } from "../src/data/indexeddb.ts";
test("14天边界：超过14天需核对，旧记录不自动改变",()=>{
 const p={id:"old",start:"2026-10-01",end:null};
 assert.equal(needsReview(p,"2026-10-14"),false);
 assert.equal(needsReview(p,"2026-10-15"),true);
 assert.equal(p.end,null);
});
test("新经期必须先明确结束旧经期，非法日期/同日结束不修改原数据",()=>{
 const d=fixture();d.periods=[{id:"old",start:"2026-10-01",end:null}];const original=structuredClone(d);
 assert.throws(()=>reviewPeriod(d,"old",null,false,"2026-11-16","new"));
 assert.throws(()=>reviewPeriod(d,"old","2026-11-16",false,"2026-11-16","new"));
 assert.deepEqual(d,original);
 const next=reviewPeriod(d,"old","2026-10-05",false,"2026-11-16","new");
 assert.equal(next.periods[0].end,"2026-10-05");assert.equal(next.periods[1].start,"2026-11-16");
});
test("未知结束日期待确认：不伪造日期，可开始新周期、备份恢复和数据库回读",async()=>{
 const d=fixture();d.periods=[{id:"old",start:"2026-10-01",end:null}];
 const next=reviewPeriod(d,"old",null,true,"2026-11-16","new");
 assert.equal(next.periods[0].end,null);assert.equal(next.periods[0].endPending,true);
 assert.deepEqual(importBackup(exportBackup(next)),next);
 const repo=createIndexedRepository(new IDBFactory(),"pending");await repo.commit(next,0);
 assert.deepEqual((await repo.load()).data,next);
 assert.equal(needsReview(next.periods[0],"2026-11-16"),false);
 const corrected=reviewPeriod(next,"old","2026-10-05",false,"2026-11-16");
 assert.equal(corrected.periods[0].end,"2026-10-05");assert.equal(corrected.periods[0].endPending,undefined);
 assert.throws(()=>validateData({...next,periods:[next.periods[0],{id:"duplicate",start:"2026-10-01",end:null}]}));
 assert.throws(()=>validateData({...next,periods:next.periods.map((p,i)=>i===0?{...p,endPending:undefined}:p)}));
});
test("旧记录兼容，异常15天经期不作为正常经期时长",()=>{
 assert.deepEqual(validateData(fixture()),fixture());
 const d=fixture();d.periods=[{id:"long",start:"2026-10-01",end:"2026-10-15"}];
 assert.equal(predict(d,"2026-10-20").periodDays,d.profile.periodDays);
 d.periods[0].end="2026-10-14";
 assert.equal(predict(d,"2026-10-20").periodDays,14);
});
test("v2 数据库升级保留 ID/日期/偏好；旧版连接拒绝降级写入",async()=>{
 const factory=new IDBFactory(),old=fixture();
 await new Promise((resolve,reject)=>{const r=factory.open("v2",2);r.onupgradeneeded=()=>r.result.createObjectStore("state");r.onerror=()=>reject(r.error);r.onsuccess=()=>{const db=r.result,tx=db.transaction("state","readwrite");tx.objectStore("state").put({schemaVersion:2,revision:9,data:old},"root");tx.oncomplete=()=>{db.close();resolve();};};});
 const current=await createIndexedRepository(factory,"v2").load();
 assert.equal(current.schemaVersion,3);assert.equal(current.revision,9);assert.deepEqual(current.data,old);
 await new Promise((resolve,reject)=>{const request=factory.open("v2",2);request.onerror=()=>{assert.equal(request.error.name,"VersionError");resolve();};request.onsuccess=()=>{request.result.close();reject(Error("Old client must not write"));};});
});
test("兼容分享成功；取消不报成功也不下载",async()=>{
 const file=new File(["synthetic"],"backup.json",{type:"application/json"});let downloads=0,shares=0;
 assert.equal(await shareOrDownload(file,{canShare:()=>true,share:async()=>{shares++;}},()=>downloads++),"shared");
 assert.equal(shares,1);assert.equal(downloads,0);
 assert.equal(await shareOrDownload(file,{canShare:()=>true,share:async()=>{throw new DOMException("cancel","AbortError");}},()=>downloads++),"cancelled");
 assert.equal(downloads,0);assert.match(exportMessage("cancelled"),/取消/);
});
test("不支持文件分享、权限失败、能力检测异常均下载回退，下载失败向上传递",async()=>{
 const file=new File(["synthetic"],"reminder.ics");let downloads=0;
 for(const platform of [{},{canShare:()=>false},{canShare:()=>{throw Error("unavailable");}},{canShare:()=>true,share:async()=>{throw Error("blocked");}}]) {
  assert.equal(await shareOrDownload(file,platform,()=>downloads++),"downloaded");
 }
 assert.equal(downloads,4);
 await assert.rejects(()=>shareOrDownload(file,{},()=>{throw Error("download failed");}));
});
