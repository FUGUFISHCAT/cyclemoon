import http from "node:http";
import { readFile, stat } from "node:fs/promises";
import path from "node:path";
const root = path.resolve("dist"),
  port = Number(process.env.PORT ?? 4173);
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
    let file = path.resolve(root, "." + decoded);
    if (!file.startsWith(root + path.sep)) file = path.join(root, "index.html");
    try {
      if ((await stat(file)).isDirectory())
        file = path.join(file, "index.html");
    } catch {
      if (!path.extname(file)) file += ".html";
    }
    const content = await readFile(file);
    res.writeHead(200, {
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
