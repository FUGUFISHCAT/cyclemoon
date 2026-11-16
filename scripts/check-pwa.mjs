import assert from "node:assert/strict";
import { readFile, stat } from "node:fs/promises";
import path from "node:path";
const root = path.resolve("dist");
const base = JSON.parse(await readFile(path.join(root,"pwa-version.json"),"utf8")).base ?? "";
const manifest = JSON.parse(
  await readFile(path.join(root, "manifest.webmanifest"), "utf8"),
);
assert.equal(manifest.display, "standalone");
assert.equal(manifest.start_url, base + "/");
assert.equal(manifest.scope, base + "/");
const apple = await readFile(path.join(root, "icons/apple-touch-icon.png"));
assert.equal(apple.readUInt32BE(16), 180);
assert.equal(apple.readUInt32BE(20), 180);
const sw = await readFile(path.join(root, "sw.js"), "utf8");
assert.ok(!/indexedDB\s*\.|deleteDatabase\s*\(/.test(sw), "worker must not access health database");
const headers = await readFile(path.join(root, "_headers"), "utf8");
assert.match(headers, /Content-Security-Policy:.*connect-src 'self'/);
const urls = JSON.parse(sw.match(/const ASSETS=(\[[^\n]+\]);/)[1]);
for (const url of urls) {
  assert.ok(
    url.startsWith("/") && !url.includes(":") && !url.includes("\\"),
    "unsafe asset path",
  );
  await stat(path.join(root, url.slice(base.length)));
}
for (const route of ["index", "calendar", "record", "insights", "settings"]) {
  const html = await readFile(path.join(root, route + ".html"), "utf8");
  assert.match(html, /viewport-fit=cover/);
  assert.match(html, /正在启动月相/);
  assert.doesNotMatch(html, /\b20\d{2}-\d{2}-\d{2}\b/, "Static shell must not freeze build-day dates before hydration");
  assert.match(html, /manifest.webmanifest/);
  assert.match(html, /<script[^>]+src=["'][^"']*_expo\/static\/js\/web\//);
  assert.ok(
    !html.includes("QA 合成记录") && !html.includes("QA 离线新增"),
    "test data leaked into HTML",
  );
}
console.log(
  "PWA checks passed: standalone manifest, 180px iPhone icon, " +
    urls.length +
    " valid local cache assets, 5 hydrated pages.",
);
