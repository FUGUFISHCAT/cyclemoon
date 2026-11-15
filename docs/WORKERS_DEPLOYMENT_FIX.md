# Workers 静态资源 404：修复与部署指南

日期：2026-11-15。项目 cyclemoon-test；未登录、未执行线上部署、未修改用户记录或数据库。

## 原因与修复

截图中的 HTML 已加载，但所有子目录资源 404。检查原 ZIP 的原始条目证实：`icons\icon-192.png`、`_expo\static\js\web\entry-….js` 使用 Windows 反斜杠。根目录 HTML 能加载，子目录却不能通过标准 URL 访问，与这一打包缺陷吻合。没有直接读取到 Cloudflare 上传后的资产清单，因此不能排除还有旧缓存或上传配置问题。

原打包脚本使用 Windows .NET Framework CreateFromDirectory。原校验把条目反斜杠转换后再比较，使路径问题漏检。现改为逐文件 CreateEntryFromFile，显式写入 `/`；校验直接检查原始路径，拒绝反斜杠、绝对路径、上级目录，然后对全部文件逐个核对 SHA-256。根目录没有 dist/ 外层。

Expo `web.output=static`、根路径引用与 Workers Static Assets 兼容，不需要把 JS 内嵌 HTML，也不能通过给 404 HTML 强加 JS MIME 解决。PNG 本身存在且尺寸正常，图标修复为 ZIP 路径修复。未改变域名、数据库名或历史记录。

## 新交付物

ZIP：`F:\新项目\月相\artifacts\cyclemoon-pwa-0.3.0-930729e04885e306-workers.zip`

SHA-256：`f70c3f9ddc99eb3d7b281b310caae1686b9e22a1efe4f6a60388593dad401dbf`

48 个文件。`.zip.sha256` 与 `.zip.manifest.json` 在同目录。不要上传旧的无 `-workers` 后缀 ZIP。

正确根目录示例：

```text
index.html
settings.html
record.html
calendar.html
insights.html
_expo/static/js/web/*.js
icons/icon-192.png
icons/icon-512.png
icons/apple-touch-icon.png
manifest.webmanifest
sw.js
pwa-register.js
pwa-version.json
_headers
```

## 本次实际测试

- TypeScript、ESLint、41 项自动化测试通过；重新生成 Web 生产构建。
- 原始 ZIP 条目检查：新包全部是 `/`，完整相对路径与 dist 一致；没有额外顶层目录。
- 直接 dist 和新 ZIP 解压目录分别执行 `node scripts/check-http.mjs`，各通过 52 个 URL 检查：首页、五条导航路由、预缓存所有资源、HTML src/href 引用、manifest 图标。所有请求 200，JS/CSS/PNG/manifest MIME 正确，静态响应字节与本地文件一致。
- 不存在的 JS 返回 404，不伪装成首页 HTML。
- 所有 manifest PNG 和 iPhone 180px 图标签名、尺寸通过；原始图标未损坏。
- 实际浏览器启动的是新 ZIP 解压后的目录 localhost:4211，而非开发服务器。设置 30 / 5；选择 2026-11-05 至 2026-11-09；保存并回首页，预测为 2026-12-05；刷新后仍在，控制台 error 列表为空。
- 截图 qa/workers-zip-verified.png 只含虚构记录，不在部署包中。
- 这是本地 HTTP 生产外壳模拟，不是 Cloudflare 边缘运行时或线上/iPhone 验收。线上仍需用户上传后检查。

## 在现有 Cloudflare 项目更新

1. 进入 Workers & Pages → **已有 cyclemoon-test**，不要新建、不要删除。当前是 workers.dev 的 Worker，不是 pages.dev 的 Pages；历史 Pages 文档不要直接套用到 Worker 代码编辑器。
2. 使用该项目提供的静态资产上传 / 新部署入口，上传上述完整 ZIP。若先解压再上传，必须选择解压目录内全部文件和子目录，不能只上传 HTML，不能只在 Worker 代码编辑器粘贴 HTML。
3. 上传预览中核对至少 `index.html`、`_expo/static/js/web/entry-b9c72fada9777dd0698eeb58bedc8383.js`、`icons/icon-192.png`。必须保留嵌套目录，不能显示为含字面反斜杠的文件名。再由你确认部署到原 Worker / 原域名。
4. 如果现有仪表盘没有完整静态资产更新入口，可在此项目目录手动使用 Wrangler：`npx wrangler deploy --config wrangler.jsonc`。**此命令会部署，本次没有运行。** 配置明确 name=cyclemoon-test、assets.directory=./dist、HTML drop-trailing-slash、缺失资源返回 404；不要选择其他账号或项目。部署前确认你希望该 Worker 作为纯静态应用运行；若它另有自定义 Worker 逻辑，应先保留该逻辑并按官方 ASSETS 绑定方式整合。
5. 线上先直接打开 `/icons/icon-192.png`，应显示图标；直接打开上述 entry JS，必须 200 且 Content-Type 为 JavaScript。再打开首页检查启动，访问 /settings 并刷新；不要只根据 Ready 判定成功。
6. `/pwa-version.json` 应显示 version `930729e04885e306`。查看网页源代码，引用的 JS 名称必须存在于本次上传清单，不应出现旧部署 hash。若任一文件 404，先解决上传清单 / 路由问题，再测业务功能。

官方配置依据：[Workers Static Assets](https://developers.cloudflare.com/workers/static-assets/)、[assets.directory 和绑定](https://developers.cloudflare.com/workers/static-assets/binding/)、[HTML 路由](https://developers.cloudflare.com/workers/static-assets/routing/advanced/html-handling/)。配置文件在项目根目录，不需要把 wrangler.jsonc 上传为公开资产。

## 缓存与数据保护

旧 HTTP HTML 或旧 SW 可以引用旧 hash；本次重新构建的全部文件必须一次完整上传。不要只替换 HTML。SW 更新需完整预缓存和哈希验证，不成功则保留旧版，不主动删除 IndexedDB。

更新后关闭该站点全部标签和主屏幕窗口，等旧客户端释放再重开；能进设置时使用“检查新版本 / 应用更新”。若仍显示旧资源，可在桌面 DevTools 的 Network 临时禁用 HTTP cache，并在 Service Workers 临时勾选 Bypass for network，读取网络上的真实 HTML 与 JS；这不是清除数据，验收后取消临时选项。

**不要使用 Clear site data、删除 IndexedDB、重置记录或重建 Cloudflare 项目。** 清浏览器全部站点数据会丢失未备份记录，不能作为资源 404 的修复步骤。若旧 HTML 仍引用已经撤下的旧文件，优先通过完整部署、更新检测和同源重新加载恢复。
