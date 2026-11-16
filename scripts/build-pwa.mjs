import { renderWorker } from "./service-worker.mjs";
import { readdir, readFile, writeFile, mkdir } from "node:fs/promises";
import { createHash } from "node:crypto";
import path from "node:path";
const base = process.env.EXPO_PUBLIC_BASE_PATH ?? "";
if (!["", "/cyclemoon"].includes(base)) throw Error("Invalid deployment base");
const root = path.resolve("dist");
const manifestPath = path.join(root, "manifest.webmanifest");
const manifest = JSON.parse(await readFile(manifestPath,"utf8"));
manifest.id = manifest.start_url = manifest.scope = base + "/";
manifest.icons = manifest.icons.map(icon => ({...icon, src: base + icon.src}));
await writeFile(manifestPath, JSON.stringify(manifest,null,2));
await writeFile(path.join(root,".nojekyll"), "");
// Directory indexes support hosts without extensionless .html rewrites.
for (const route of ["calendar", "record", "insights", "settings"]) {
  await mkdir(path.join(root, route), {recursive: true});
  await writeFile(path.join(root, route, "index.html"), await readFile(path.join(root, route + ".html")));
}
const html = await readFile(path.join(root, "index.html"), "utf8");
if (!/<script[^>]+src=["'][^"']*_expo\/static\/js\/web\//.test(html))
  throw Error(
    "HTML lacks hydration scripts. Check useServerDocumentContext in +html.tsx.",
  );
async function walk(dir) {
  const entries = await readdir(dir, { withFileTypes: true });
  const lists = await Promise.all(
    entries.map((e) =>
      e.isDirectory() ? walk(path.join(dir, e.name)) : [path.join(dir, e.name)],
    ),
  );
  return lists.flat();
}
const files = (await walk(root))
  .filter(
    (p) =>
      !["sw.js", "pwa-version.json", "_headers"].includes(path.basename(p)) &&
      !p.endsWith(".map"),
  )
  .sort();
if (!files.some((p) => path.relative(root, p) === "index.html"))
  throw Error("Missing index.html");
if (
  files.some((p) =>
    /backup|\.ics$|\.sqlite|\.db$|\.env|\.(pem|key|p12|pfx|keystore)$|test-results|qa-fixture/i.test(
      path.relative(root, p),
    ),
  )
)
  throw Error("Unexpected private or test artifact in dist");
const urls = files.map(
  (p) => base + "/" + path.relative(root, p).replaceAll(path.sep, "/"),
);
const hash = createHash("sha256");
hash.update(renderWorker.toString());
const baseHeaders = (await readFile("public/_headers", "utf8")).replaceAll("\r\n", "\n");
hash.update(baseHeaders);
const inlineHashes = new Set();
const integrity = {};
for (const file of files) {
  hash.update(path.relative(root, file));
  hash.update(await readFile(file));
  const bytes = await readFile(file);
  if (/-----BEGIN (?:[A-Z ]+ )?PRIVATE KEY-----/.test(bytes.toString("utf8"))) throw Error("Private key found in static output");
  integrity[base + "/" + path.relative(root, file).replaceAll(path.sep, "/")] = createHash("sha256").update(bytes).digest("hex");
  if (file.endsWith(".json")) {
    const content = JSON.parse(bytes.toString("utf8"));
    if (content.app === "CycleMoonBackup" || content.cycleRecords || content.dailyLogs || content.data?.periods || content.data?.entries)
      throw Error("Health backup/data artifact found in static output");
  }
  if (file.endsWith(".html")) {
    for (const script of bytes.toString("utf8").matchAll(/<script([^>]*)>([\s\S]*?)<\/script>/g)) {
      if (script[2] && !/\bsrc=/.test(script[1])) inlineHashes.add("'sha256-" + createHash("sha256").update(script[2]).digest("base64") + "'");
    }
  }
}
const version = hash.digest("hex").slice(0, 16);
const routes = ["/", "/calendar", "/record", "/insights", "/settings"].map(route => base + route);
if(base) routes[0]=base;
const worker = renderWorker(version, urls, routes, integrity, base);
await writeFile(path.join(root, "sw.js"), worker);
const policy = `default-src 'self'; script-src 'self' ${[...inlineHashes].join(" ")}; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; font-src 'self' data:; connect-src 'self'; worker-src 'self'; manifest-src 'self'; object-src 'none'; base-uri 'none'; form-action 'none'; frame-ancestors 'none'`;
await writeFile(path.join(root, "_headers"), baseHeaders.replace("/*\n", "/*\n  Content-Security-Policy: " + policy + "\n"));
await writeFile(
  path.join(root, "pwa-version.json"),
  JSON.stringify({ appVersion: "0.3.1", version, base }),
);
console.log(
  "PWA shell " +
    version +
    ": " +
    urls.length +
    " static assets. No user data included.",
);
