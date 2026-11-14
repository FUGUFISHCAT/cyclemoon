import test from "node:test";
import assert from "node:assert/strict";
import vm from "node:vm";
import { webcrypto, createHash } from "node:crypto";
import { renderWorker } from "../scripts/service-worker.mjs";

function environment({ fail = false, clients = 1, integrity = {}, content } = {}) {
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
        async put(url,response) {content.set(url,response);},
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
    crypto: webcrypto,
    Uint8Array,
    fetch: async () => {
      if (content !== undefined) return new Response(content);
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
      integrity,
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
test("200 响应内容不匹配时拒绝更新，避免 CDN 混合版本外壳", async () => {
 const assets=["/index.html","/settings.html","/entry.js"];
 const integrity=Object.fromEntries(assets.map(url=>[url,createHash("sha256").update("correct").digest("hex")]));
 const bad=environment({integrity,content:"wrong deployment"});
 bad.stores.set("cyclemoon-shell-old",new Map());
 await assert.rejects(()=>bad.dispatch("install"),/mismatch/);
 assert.ok(bad.stores.has("cyclemoon-shell-old"));assert.ok(!bad.stores.has("cyclemoon-shell-new"));
 const good=environment({integrity,content:"correct"});await good.dispatch("install");
 assert.equal(await good.stores.get("cyclemoon-shell-new").get("/entry.js").text(),"correct");
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
test("旧版清理消息不会删除外壳；新旧页面资源可共存", async () => {
  const e = environment();
  e.stores.set("cyclemoon-shell-old", new Map());
  e.stores.set("other-app", new Map());
  await e.dispatch("install");
  e.self.registration.waiting = {};
  await e.dispatch("message", { data: { type: "PRUNE_OLD" } });
  assert.ok(e.stores.has("cyclemoon-shell-old"));
  e.self.registration.waiting = null;
  await e.dispatch("message", { data: { type: "PRUNE_OLD" } });
  assert.ok(e.stores.has("cyclemoon-shell-old"));
  assert.ok(e.stores.has("cyclemoon-shell-new"));
  assert.ok(e.stores.has("other-app"));
});

test("新 worker 为挂起的旧页面提供旧版不可变 JS，离线不破坏已有窗口", async () => {
 const e=environment(); await e.dispatch("install");
 const url="/_expo/static/js/web/entry-0123456789abcdef0123456789abcdef.js";
 e.stores.set("cyclemoon-shell-old",new Map([[url,new Response("old-chunk")]]));
 const response=await e.dispatch("fetch",{request:{method:"GET",mode:"cors",url:"https://cycle.test"+url}});
 assert.equal(await response.text(),"old-chunk");
});
