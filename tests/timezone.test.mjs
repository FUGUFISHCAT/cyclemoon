import test from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
test("本地今天遵循时区；闰年、跨年及夏令时日历间隔不受时区影响",()=>{
 const script=`import {localToday,daysBetween,addDays} from './src/domain/dates.ts';
 const OriginalDate=Date;
 globalThis.Date=class extends OriginalDate {constructor(...args){super(...(args.length?args:['2026-01-01T00:30:00Z']));}};
 process.stdout.write(JSON.stringify({today:localToday(),dst:daysBetween('2026-03-07','2026-03-09'),leap:addDays('2024-02-28',1),year:addDays('2026-12-31',1)}));`;
 for(const [TZ,today] of [['Asia/Shanghai','2026-01-01'],['America/Los_Angeles','2025-12-31'],['Pacific/Kiritimati','2026-01-01']]){
  const child=spawnSync(process.execPath,['--input-type=module','-e',script],{cwd:process.cwd(),env:{...process.env,TZ},encoding:'utf8'});
  assert.equal(child.status,0,child.stderr);
  assert.deepEqual(JSON.parse(child.stdout),{today,dst:2,leap:'2024-02-29',year:'2027-01-01'});
 }
});
