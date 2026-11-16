import http from "node:http";
import { readFile, stat } from "node:fs/promises";
import path from "node:path";
const root = path.resolve(process.env.WEB_ROOT ?? "dist"),
  port = Number(process.env.PORT ?? 4173);
const base = JSON.parse(await readFile(path.join(root,"pwa-version.json"),"utf8")).base ?? "";
const types = {
  ".html": "text/html;charset=utf-8",
  ".js": "application/javascript;charset=utf-8",
  ".json": "application/json",
  ".webmanifest": "application/manifest+json",
  ".css": "text/css",
  ".png": "image/png",
  ".svg": "image/svg+xml",
  ".ttf": "font/ttf",
  ".woff2": "font/woff2",
  ".ico": "image/x-icon",
};
const server = http.createServer(async (req, res) => {
  if (!["GET", "HEAD"].includes(req.method)) {
    res.writeHead(405);
    res.end();
    return;
  }
  try {
    const url = new URL(req.url, "http://localhost"),
      decoded = decodeURIComponent(url.pathname);
    if (
      decoded.includes("..") ||
      decoded.includes("\\") ||
      decoded.includes("\0")
    )
      throw Error("path");
    if (base && decoded === base) {res.writeHead(301,{Location:base+"/"});res.end();return;}
    if (base && !decoded.startsWith(base+"/")) throw Error("Outside app");
    let file = path.resolve(root, "." + decoded.slice(base.length));
    if (!file.startsWith(root + path.sep)) file = path.join(root, "index.html");
    try {
      if ((await stat(file)).isDirectory())
        file = path.join(file, "index.html");
    } catch {
      if (!path.extname(file)) file += ".html";
    }
    const content = await readFile(file);
    const sharedHeaders = {};
    const config = await readFile(path.join(root, "_headers"), "utf8").catch(() => "");
    for (const line of config.split(/\r?\n/).slice(1)) {
      if (!/^\s/.test(line)) break;
      const colon = line.indexOf(":");
      if (colon > 0) sharedHeaders[line.slice(0, colon).trim()] = line.slice(colon + 1).trim();
    }
    res.writeHead(200, {
      ...sharedHeaders,
      "Content-Type": types[path.extname(file)] ?? "application/octet-stream",
      "Cache-Control": "no-store",
      "X-Content-Type-Options": "nosniff",
      "Referrer-Policy": "no-referrer",
    });
    res.end(req.method === "HEAD" ? undefined : content);
  } catch {
    res.writeHead(404, { "Content-Type": "text/plain;charset=utf-8" });
    res.end("Not found");
  }
});
server.listen(port, "0.0.0.0", () =>
  console.log(
    "Static PWA: http://localhost:" +
      port +
      " (phone offline tests require HTTPS hosting)",
  ),
);
