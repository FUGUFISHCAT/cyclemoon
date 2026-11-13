import test from "node:test";
import assert from "node:assert/strict";
import vm from "node:vm";
import { renderWorker } from "../scripts/service-worker.mjs";

function environment({ fail = false, clients = 1 } = {}) {
  const listeners = {},
    stores = new Map(),
    deleted = [];
  const caches = {
    async open(key) {
      if (!stores.has(key)) stores.set(key, new Map());
      const content = stores.get(key);
      return {
        async addAll(requests) {
          if (fail) throw Error("network");
          for (const r of requests)
            content.set(r.url, new Response("cached:" + r.url));
        },
        async match(url) {
          return content.get(url)?.clone();
        },
      };
    },
    async delete(key) {
      deleted.push(key);
      return stores.delete(key);
    },
    async keys() {
      return [...stores.keys()];
    },
  };
  const self = {
    location: { origin: "https://cycle.test" },
    registration: { installing: null, waiting: null },
    clients: {
      async matchAll() {
        return Array(clients).fill({});
      },
      async claim() {},
    },
    skipWaiting() {},
    addEventListener(name, fn) {
      listeners[name] = fn;
    },
  };
  const context = {
    self,
    caches,
    URL,
    Response,
    Request: class {
      constructor(url) {
        this.url = url;
      }
    },
    fetch: async () => {
      throw Error("offline");
    },
  };
  Object.defineProperty(context, "indexedDB", {
    get() {
      throw Error("Worker must never access IndexedDB");
    },
  });
  vm.runInNewContext(
    renderWorker(
      "new",
      ["/index.html", "/settings.html", "/entry.js"],
      ["/", "/settings"],
    ),
    context,
  );
  async function dispatch(name, event = {}) {
    let result;
    listeners[name]({
      ...event,
      waitUntil(p) {
        result = p;
      },
      respondWith(p) {
        result = p;
      },
    });
    return await result;
  }
  return { stores, deleted, dispatch, self };
}
test("安装缓存应用外壳，不触碰 IndexedDB；离线导航可读取缓存", async () => {
  const e = environment();
  await e.dispatch("install");
  await e.dispatch("activate");
  const response = await e.dispatch("fetch", {
    request: {
      method: "GET",
      mode: "navigate",
      url: "https://cycle.test/settings?date=2026-11-13",
    },
  });
  assert.equal(await response.text(), "cached:/settings.html");
  assert.equal(
    await e.dispatch("fetch", {
      request: {
        method: "POST",
        mode: "cors",
        url: "https://cycle.test/entry.js",
      },
    }),
    undefined,
  );
  assert.equal(
    await e.dispatch("fetch", {
      request: {
        method: "GET",
        mode: "cors",
        url: "https://cycle.test/private-backup.json",
      },
    }),
    undefined,
  );
  assert.equal(
    await e.dispatch("fetch", {
      request: {
        method: "GET",
        mode: "cors",
        url: "https://other.test/entry.js",
      },
    }),
    undefined,
  );
});
test("新外壳下载失败只删除不完整新缓存，保留旧版与其他应用缓存", async () => {
  const e = environment({ fail: true });
  e.stores.set("cyclemoon-shell-old", new Map());
  e.stores.set("other-app", new Map());
  await assert.rejects(() => e.dispatch("install"));
  assert.ok(e.stores.has("cyclemoon-shell-old"));
  assert.ok(e.stores.has("other-app"));
  assert.ok(!e.stores.has("cyclemoon-shell-new"));
});
test("更新激活不直接删除旧文件；多窗口不执行旧缓存清理", async () => {
  const e = environment({ clients: 2 });
  e.stores.set("cyclemoon-shell-old", new Map());
  await e.dispatch("install");
  await e.dispatch("activate");
  await e.dispatch("message", { data: { type: "PRUNE_OLD" } });
  assert.ok(e.stores.has("cyclemoon-shell-old"));
});
test("新页面单窗口加载后只清理旧外壳缓存；等待中的更新缓存受保护", async () => {
  const e = environment();
  e.stores.set("cyclemoon-shell-old", new Map());
  e.stores.set("other-app", new Map());
  await e.dispatch("install");
  e.self.registration.waiting = {};
  await e.dispatch("message", { data: { type: "PRUNE_OLD" } });
  assert.ok(e.stores.has("cyclemoon-shell-old"));
  e.self.registration.waiting = null;
  await e.dispatch("message", { data: { type: "PRUNE_OLD" } });
  assert.ok(!e.stores.has("cyclemoon-shell-old"));
  assert.ok(e.stores.has("cyclemoon-shell-new"));
  assert.ok(e.stores.has("other-app"));
});
