import test from "node:test";
import assert from "node:assert/strict";
import {entryForDate,dateSwitchNeedsConfirmation} from "../src/domain/record-draft.ts";
import {fixture} from "./helpers.mjs";
test("切换日期自动读取对应日志，空日期不继承其他日的备注",()=>{
 const data=fixture();const existing=entryForDate(data,data.entries[0].date);
 assert.equal(existing.note,data.entries[0].note);
 const blank=entryForDate(data,"2026-11-25");assert.equal(blank.note,"");assert.equal(blank.pain,0);
 blank.note="draft";assert.equal(data.entries[0].note,existing.note);
 assert.throws(()=>entryForDate(data,"2026-02-30"));
});
test("未保存内容切日必须确认，同日或未修改不会误阻止",()=>{
 const base=entryForDate(fixture(),"2026-11-25");
 assert.equal(dateSwitchNeedsConfirmation(base,base,"2026-11-24"),false);
 assert.equal(dateSwitchNeedsConfirmation({...base,note:"未保存"},base,"2026-11-24"),true);
 assert.equal(dateSwitchNeedsConfirmation({...base,note:"未保存"},base,base.date),false);
});
