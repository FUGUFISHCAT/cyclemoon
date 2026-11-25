import "./check-pwa.mjs";
import { Buffer } from "node:buffer";
import { readdir, readFile, mkdir, writeFile, realpath } from "node:fs/promises";
import { createHash } from "node:crypto";
import { spawnSync } from "node:child_process";
import path from "node:path";
import assert from "node:assert/strict";
const workspace = await realpath(process.cwd());
const root = await realpath("dist");
assert.equal(root, path.join(workspace, "dist"));
async function walk(folder) {
  const result=[];
  for (const entry of await readdir(folder,{withFileTypes:true})) {
    assert.ok(!entry.isSymbolicLink(),"No links allowed in deployment");
    const file=path.join(folder,entry.name);
    if(entry.isDirectory())result.push(...await walk(file)); else result.push(file);
  }
  return result.sort();
}
const files=await walk(root);
const expected={};
for(const file of files) {
  const name=path.relative(root,file).replaceAll(path.sep,"/");
  assert.ok(!/backup|\.ics$|\.env|\.(db|sqlite|pem|key|p12|pfx|keystore|map)$|test-results|qa-fixture/i.test(name),"Private artifact: "+name);
  expected[name]=createHash("sha256").update(await readFile(file)).digest("hex");
}
const version=JSON.parse(await readFile("dist/pwa-version.json","utf8"));
assert.match(version.version,/^[a-f0-9]{16}$/);
assert.equal(version.appVersion,"0.4.0");
await mkdir("artifacts",{recursive:true});
const zip=path.resolve(`artifacts/cyclemoon-pwa-0.4.0-${version.version}-static.zip`);
const quote=value=>"'"+value.replaceAll("'","''")+"'";
const script=`$ErrorActionPreference='Stop'
[Console]::OutputEncoding=[System.Text.UTF8Encoding]::new($false)
Add-Type -AssemblyName System.IO.Compression.FileSystem
Add-Type -AssemblyName System.IO.Compression
if (-not (Test-Path -LiteralPath ${quote(zip)})) {
 $created=[System.IO.Compression.ZipFile]::Open(${quote(zip)},[System.IO.Compression.ZipArchiveMode]::Create)
 try {
  $base=${quote(root)}
  foreach($file in [System.IO.Directory]::GetFiles($base,'*',[System.IO.SearchOption]::AllDirectories)) {
   $relative=$file.Substring($base.Length+1).Replace('\\','/')
   [System.IO.Compression.ZipFileExtensions]::CreateEntryFromFile($created,$file,$relative,[System.IO.Compression.CompressionLevel]::Optimal) | Out-Null
  }
 } finally { $created.Dispose() }
}
$archive=[System.IO.Compression.ZipFile]::OpenRead(${quote(zip)})
try {
 $result=@{}
 foreach($entry in $archive.Entries) {
  if ($entry.FullName.EndsWith('/')) { continue }
  $stream=$entry.Open(); $sha=[System.Security.Cryptography.SHA256]::Create()
  try { if ($entry.FullName.Contains('\\') -or $entry.FullName.StartsWith('/') -or $entry.FullName.Contains('../')) { throw 'Unsafe ZIP path' }
  $result[$entry.FullName]=([BitConverter]::ToString($sha.ComputeHash($stream))).Replace('-','').ToLowerInvariant() }
  finally { $sha.Dispose(); $stream.Dispose() }
 }
 $result | ConvertTo-Json -Compress
} finally { $archive.Dispose() }`;
const child=spawnSync("powershell.exe",["-NoProfile","-NonInteractive","-EncodedCommand",Buffer.from(script,"utf16le").toString("base64")],{encoding:"utf8",windowsHide:true});
if(child.status!==0)throw Error(child.stderr||"ZIP creation failed");
assert.deepEqual(JSON.parse(child.stdout.trim()),expected,"ZIP content differs from checked dist");
const sha256=createHash("sha256").update(await readFile(zip)).digest("hex");
await writeFile(zip+".sha256",sha256+"  "+path.basename(zip)+"\n");
await writeFile(zip+".manifest.json",JSON.stringify({appVersion:"0.4.0",shellVersion:version.version,sha256,files:expected},null,2));
console.log(`Verified ZIP: ${zip}\n${files.length} files; SHA-256 ${sha256}`);
