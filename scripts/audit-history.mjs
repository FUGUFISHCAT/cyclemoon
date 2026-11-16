import { execFileSync } from "node:child_process";
const git=(args)=>execFileSync("git",args,{encoding:"utf8",maxBuffer:64*1024*1024});
const files=git(["-c","core.quotepath=false","rev-list","--objects","--all"]).trim().split("\n");
const issues=[];let inspected=0;
for(const row of files){
 const space=row.indexOf(" ");if(space<0)continue;
 const hash=row.slice(0,space),name=row.slice(space+1);
 if(/(^|\/)(\.env(?:\..*)?|\.npmrc)$|\.(pem|key|p12|pfx|sqlite|db|ics)$|cycle-backup-.*\.json$/i.test(name)){
  // .npmrc may contain only non-secret registry preferences.
  if(!name.endsWith(".npmrc"))issues.push(name+": sensitive filename");
 }
 if(!/\.(json|[cm]?js|tsx?|ya?ml|md|txt)$|(^|\/)\.npmrc$/.test(name))continue;
 if(git(["cat-file","-t",hash]).trim()!=="blob")continue;
 const content=git(["cat-file","-p",hash]);inspected++;
 if(/-----BEGIN (?:[A-Z ]+ )?PRIVATE KEY-----|gh[pousr]_[A-Za-z0-9]{30,}|github_pat_[A-Za-z0-9_]{40,}|AKIA[0-9A-Z]{16}|_authToken\s*=\s*[^$\s][^\s]{12,}/.test(content))issues.push(name+": credential pattern");
 if(name.endsWith(".json")){
  try{const value=JSON.parse(content);if(value.app==="CycleMoonBackup"||value.cycleRecords||value.dailyLogs)issues.push(name+": health backup");}catch{/* Non-JSON text is handled by credential checks. */}
 }
}
if(issues.length)throw Error("History audit needs review (no secret values printed):\n"+[...new Set(issues)].join("\n"));
console.log(`History guard PASS: ${inspected} text blobs across all local refs; inspect screenshots/manually supplied content separately. Pattern scans cannot prove absence of every password.`);
