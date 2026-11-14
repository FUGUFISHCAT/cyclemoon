import test from "node:test";
import assert from "node:assert/strict";
import { createStore } from "zustand/vanilla";
import { dataState } from "../src/store/data-controller.ts";
import { createIndexedRepository } from "../src/data/indexeddb.ts";
import { IDBFactory } from "fake-indexeddb";
import { fixture } from "./helpers.mjs";
import { emptyData } from "../src/domain/model.ts";
test("其他窗口清空记录后，本窗口回读触发草稿销毁，不遗留旧健康草稿",async()=>{
 const repo=createIndexedRepository(new IDBFactory(),"clear");await repo.commit(fixture(),0);
 const store=createStore(dataState(()=>repo));await store.getState().load();
 const epoch=store.getState().privacyEpoch;
 await repo.commit(emptyData(),1);await store.getState().load();
 assert.equal(store.getState().privacyEpoch,epoch+1);
 assert.deepEqual(store.getState().snapshot.data,emptyData());
 assert.equal(await store.getState().save(fixture(),1),false);
});

test("跨窗口信号失败仍报告已提交；后台读取失败保留已加载数据", async () => {
 const repo=createIndexedRepository(new IDBFactory(),"store");
 let fail=false;
 const store=createStore(dataState(()=>({...repo,load:()=>fail?Promise.reject(Error("存储不可用")):repo.load()}),()=>{throw Error("channel");}));
 await store.getState().load();
 assert.equal(await store.getState().save(fixture()),true);
 assert.equal(store.getState().snapshot.revision,1);
 fail=true; await store.getState().load();
 assert.equal(store.getState().ready,true);
 assert.deepEqual(store.getState().snapshot.data,fixture());
 assert.match(store.getState().error,/存储不可用/);
});
test("陈旧草稿被拒绝；事务未完成前不显示成功，失败不覆盖快照", async () => {
 const repo=createIndexedRepository(new IDBFactory(),"draft");
 const store=createStore(dataState(()=>repo));
 await store.getState().load(); await repo.commit(fixture(),0); await store.getState().load();
 assert.equal(await store.getState().save(fixture(),0),false);
 assert.equal(store.getState().snapshot.revision,1);
 let reject;
 const delayed=createStore(dataState(()=>({...repo,commit:()=>new Promise((_,r)=>{reject=r;})})));
 await delayed.getState().load();
 const pending=delayed.getState().save(fixture());
 assert.equal(delayed.getState().busy,true);
 reject(Error("QuotaExceededError"));
 assert.equal(await pending,false);
 assert.equal(delayed.getState().snapshot.revision,1);
 assert.equal(delayed.getState().busy,false);
});
