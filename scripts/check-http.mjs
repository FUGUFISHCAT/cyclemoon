import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { spawn } from "node:child_process";
import path from "node:path";
import { createHash } from "node:crypto";
const root=path.resolve(process.env.WEB_ROOT ?? "dist");
const port=process.env.PORT ?? "4207";
const child=spawn(process.execPath,["scripts/serve-web.mjs"],{env:{...process.env,WEB_ROOT:root,PORT:port},stdio:["ignore","pipe","pipe"],windowsHide:true});
try {
 await new Promise((resolve,reject)=>{child.stdout.once("data",resolve);child.once("error",reject);child.once("exit",code=>reject(Error("Server exited "+code)));});
 const worker=await readFile(path.join(root,"sw.js"),"utf8");
 const assets=JSON.parse(worker.match(/const ASSETS=(\[[^\n]+\]);/)[1]);
 const urls=new Set([...assets,"/","/calendar","/record","/insights","/settings","/calendar/","/record/","/insights/","/settings/","/sw.js","/pwa-version.json"]);
 for(const route of ["index","calendar","record","insights","settings"]) {
  const html=await readFile(path.join(root,route+".html"),"utf8");
  for(const match of html.matchAll(/(?:src|href)=["'](\/[^"']+)["']/g))urls.add(match[1]);
 }
 const manifest=JSON.parse(await readFile(path.join(root,"manifest.webmanifest"),"utf8"));
 for(const icon of manifest.icons)urls.add(icon.src);
 const digest=b=>createHash("sha256").update(b).digest("hex");
 for(const url of urls) {
  const response=await fetch(`http://localhost:${port}${url}`);
  assert.equal(response.status,200,url);
  const type=response.headers.get("content-type")??"";
  if(url.endsWith(".js"))assert.match(type,/javascript/,url);
  if(url.endsWith(".css"))assert.match(type,/text\/css/,url);
  if(url.endsWith(".png"))assert.match(type,/image\/png/,url);
  if(url.endsWith(".webmanifest"))assert.match(type,/manifest\+json/,url);
  const bytes=new Uint8Array(await response.arrayBuffer());
  if(assets.includes(url))assert.equal(digest(bytes),digest(await readFile(path.join(root,url))),url);
 }
 for(const icon of [...manifest.icons,{src:"/icons/apple-touch-icon.png",sizes:"180x180"}]) {
  const bytes=await readFile(path.join(root,icon.src));
  assert.equal(bytes.subarray(1,4).toString(),"PNG");
  const [w,h]=icon.sizes.split("x").map(Number);
  assert.equal(bytes.readUInt32BE(16),w);assert.equal(bytes.readUInt32BE(20),h);
 }
 const missing=await fetch(`http://localhost:${port}/_expo/static/js/web/missing.js`);
 assert.equal(missing.status,404,"Missing JS must not become index.html");
 console.log(`HTTP PASS: ${urls.size} routes/assets, exact bytes and MIME; all manifest icon dimensions; missing JS is 404.`);
} finally {child.kill();}
