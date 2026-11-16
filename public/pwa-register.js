/* Static registration only. Never reads health data. */
(() => {
  const resize = () => {
    document.documentElement.style.setProperty("--app-height", (window.visualViewport?.height ?? window.innerHeight) + "px");
    const field = document.activeElement;
    if (field && /^(INPUT|TEXTAREA)$/.test(field.tagName)) field.scrollIntoView({block:"nearest"});
  };
  window.visualViewport?.addEventListener("resize", resize);
  window.addEventListener("resize", resize);
  window.addEventListener("load", resize);
})();
(() => {
  const base = new URL(".", document.currentScript.src).pathname;
  const info = { status: "正在检查离线支持…", waiting: false };
  let registration,
    refreshing = false;
  const publish = (status) => {
    info.status = status;
    window.dispatchEvent(new Event("cycle-pwa"));
  };
  window.cyclePwa = {
    info,
    applyUpdate: () => {
      if (!registration?.waiting) return;
      window.cyclePwa.updating = true;
      registration.waiting.postMessage({ type: "ACTIVATE_UPDATE" });
    },
  };
  if (!("serviceWorker" in navigator) || !window.isSecureContext) {
    publish("离线不可用：需要 HTTPS（电脑 localhost 除外）和支持的浏览器");
    return;
  }
  navigator.serviceWorker.addEventListener("controllerchange", () => {
    info.waiting = false;
    if (!window.cyclePwa.updating) publish("新外壳已启用；保存草稿后重新打开可使用最新界面");
    if (!refreshing && window.cyclePwa.updating) {
      refreshing = true;
      location.reload();
    }
  });
  const updateReady = () => {
    info.waiting = true;
    publish("发现新版本；当前离线版本仍可使用");
  };
  window.addEventListener("load", async () => {
    try {
      let existing = await navigator.serviceWorker.getRegistration(base);
      if (existing && existing.scope !== new URL(base, location.href).href) existing = undefined;
      const response = await fetch(base + "pwa-version.json", { cache: "no-store" }).catch(() => null);
      if (!existing && !response?.ok) {
        publish("开发模式：离线缓存未启用，请运行静态构建预览");
        return;
      }
      const version = response?.ok ? await response.json() : {version: "已缓存版本"};
      registration = existing ?? await navigator.serviceWorker.register(base + "sw.js", {
        scope: base,
        updateViaCache: "none",
      });
      if (registration.waiting) updateReady();
      registration.addEventListener("updatefound", () => {
        const worker = registration.installing;
        worker?.addEventListener("statechange", () => {
          if (worker.state === "installed") {
            if (navigator.serviceWorker.controller) updateReady();
            else publish("离线外壳已就绪 · " + version.version);
          }
          if (worker.state === "redundant")
            publish("新版本缓存未完整下载；继续使用现有版本");
        });
      });
      if (registration.active && !registration.waiting)
        publish("离线外壳已就绪（已有缓存，正在检查更新）");
      void registration.update().catch(() => {});
      setInterval(
        () => {
          void registration.update().catch(() => {});
        },
        60 * 60 * 1000,
      );
    } catch {
      publish(
        navigator.serviceWorker.controller
          ? "已使用缓存离线外壳；联网后可检查更新"
          : "离线初始化失败，请联网重新打开一次",
      );
    }
  });
})();
