import { renderWorker } from "./service-worker.mjs";
import { readdir, readFile, writeFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import path from "node:path";
const root = path.resolve("dist");
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
    /backup|\.ics$|\.sqlite|\.db$|\.env|test-results|qa-fixture/i.test(
      path.relative(root, p),
    ),
  )
)
  throw Error("Unexpected private or test artifact in dist");
const urls = files.map(
  (p) => "/" + path.relative(root, p).replaceAll(path.sep, "/"),
);
const hash = createHash("sha256");
for (const file of files) {
  hash.update(path.relative(root, file));
  hash.update(await readFile(file));
}
const version = hash.digest("hex").slice(0, 16);
const routes = ["/", "/calendar", "/record", "/insights", "/settings"];
const worker = renderWorker(version, urls, routes);
await writeFile(path.join(root, "sw.js"), worker);
await writeFile(
  path.join(root, "pwa-version.json"),
  JSON.stringify({ version }),
);
console.log(
  "PWA shell " +
    version +
    ": " +
    urls.length +
    " static assets. No user data included.",
);
