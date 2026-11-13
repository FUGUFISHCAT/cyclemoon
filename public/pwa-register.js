/* Static registration only. Never reads health data. */
(() => {
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
      if (!window.confirm("已保存编辑并备份？应用更新将重新加载页面。")) return;
      window.cyclePwa.updating = true;
      registration.waiting.postMessage({ type: "ACTIVATE_UPDATE" });
    },
  };
  if (!("serviceWorker" in navigator) || !window.isSecureContext) {
    publish("离线不可用：需要 HTTPS（电脑 localhost 除外）和支持的浏览器");
    return;
  }
  navigator.serviceWorker.addEventListener("controllerchange", () => {
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
      const response = await fetch("/pwa-version.json", { cache: "no-store" });
      if (!response.ok) {
        publish("开发模式：离线缓存未启用，请运行静态构建预览");
        return;
      }
      const version = await response.json();
      registration = await navigator.serviceWorker.register("/sw.js", {
        scope: "/",
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
      if (
        navigator.serviceWorker.controller &&
        !registration.waiting &&
        !registration.installing
      )
        navigator.serviceWorker.controller.postMessage({ type: "PRUNE_OLD" });
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
