> V0.3 当前部署包与更新策略以 RELEASE_CHECKLIST.md 和 V0.3_REPORT.md 为准。以下保留 V0.2 操作背景；V0.3 不自动删除旧外壳缓存。

# Windows → 免费 HTTPS → iPhone 主屏幕

本指南不要求 Apple Developer 会员，不使用 IPA，不上架 App Store。请使用自己的 Cloudflare 账户；本次未创建账户、未部署、未上传任何记录。

## 1. 本地构建与检查

```powershell
cd 'F:\新项目\月相'
npm run typecheck
npm run lint
npm test
npm run export:web
npm run serve:web
```

电脑打开 http://localhost:4173 。首次在线打开设置，等待“离线外壳已就绪”，然后再测离线。npm run web 是 Expo 开发模式，不代表已安装生产 Service Worker。
默认 4173 端口；如占用，在 PowerShell 执行 $env:PORT=4174 后启动。Ctrl+C 停止服务。
静态输出只在 dist；build-pwa 脚本会拒绝备份、ICS、数据库、环境文件及测试产物的常见文件名，并生成内容哈希版本号。这是防误放检查，不替代部署前人工检查。不要把备份放进 public 或 dist。

## 2. Cloudflare Pages 免费 Direct Upload

本次构建可直接使用 artifacts/cyclemoon-pwa-0.2.0-e050cb8c9eeb0cc6.zip；后续代码更改需重新构建，勿把旧包当作更新版本。

官方步骤核对日期：2026-11-13。使用免费 Pages 的 \*.pages.dev 域名即可，不必购买域名或开通付费服务。

1. 在 Windows 运行 npm run export:web，确认完成且 dist/index.html、sw.js、manifest.webmanifest、pwa-version.json 存在。
2. 检查 dist 只含应用文件。不要选择整个项目，不上传 JSON 备份、ICS、数据库或 Downloads 文件夹。
3. 自行登录 Cloudflare Dashboard → Workers & Pages → Create application → Pages → 使用 Direct Upload / Upload assets。
4. 输入项目名（如 cyclemoon-personal），选择 dist 文件夹，或将 dist **内部内容**打包成 zip 上传，确保 index.html 位于上传根目录。
5. 使用免费方案完成部署，打开生成的 https://项目名.pages.dev。不要添加服务器函数、数据库、分析插件或远程同步。
6. 核对 /sw.js 为 JavaScript，/manifest.webmanifest 为 manifest JSON；\_headers 应作为 Pages 响应头配置，不是应用路由。此工程要求部署在域名根路径，不支持不配置的子目录。
7. 后续更新在同一个 Pages 项目创建新部署并上传新 dist，保持域名与来源一致。预览域名、另一个项目、自定义域名与原域名的 IndexedDB 互不共享；迁移域名先导出再恢复。
   Direct Upload 与 Git 集成项目有切换限制，先选适合自己的方式。免费额度与界面可能变化，以官方页面为准，本工程不依赖付费功能。

官方说明：[Direct Upload](https://developers.cloudflare.com/pages/get-started/direct-upload/)、[静态 HTML](https://developers.cloudflare.com/pages/framework-guides/deploy-anything/)、[Free limits](https://developers.cloudflare.com/pages/platform/limits/)。

## 3. iPhone 添加到主屏幕（待你真机验收）

1. 用 **Safari** 打开正式 HTTPS 地址，避免微信 / 社交 App 内置浏览器及隐私浏览。
2. 打开设置，等到“离线外壳已就绪”。
3. Safari 分享按钮 → 添加到主屏幕；如系统提供“作为 Web App 打开”，保持开启。名称可用“月相”。
4. 点击主屏幕月相图标，确认独立窗口、图标、状态栏与底部安全区域正常。
5. 主屏幕安装环境与 Safari 标签页的数据共享行为可能随 iOS 改变。建议安装后从主屏幕开始录入，若已有 Safari 记录则先导出、再在主屏幕恢复。
6. 若分享菜单缺少入口，确认 Safari 与系统版本支持；本次不能替你的 iPhone 宣称安装通过。

[Apple Web App 配置](https://developer.apple.com/library/archive/documentation/AppleApplications/Reference/SafariWebContent/ConfiguringWebApplications/ConfiguringWebApplications.html)、[WebKit 主屏幕行为](https://webkit.org/blog/17333/webkit-features-in-safari-26-0/)。

## 4. 离线与保存验收

先用可丢弃的测试记录：

1. 主屏幕启动，设置周期参数并保存；记录一次经期、流量、症状、中文 / emoji / 多行备注。
2. 关闭窗口后重新启动，核对记录完整；设置中导出 JSON，确认文件已保存在“文件”App。
3. 开飞行模式并手动关闭 Wi-Fi，彻底关闭月相，再从主屏幕启动。核对五页、日历切换和历史记录。
4. 离线新增或修改一条记录；关闭并重开，确认仍在。离线也可生成本地备份与 ICS，但文件交接体验需在真机验证。
5. 恢复网络，核对无记录丢失，再导出备份。
   不要使用“清除网站数据”来做离线测试，该动作会删除 IndexedDB。只打开页面一次但未等缓存完整，不能算离线安装成功。
   iPhone 上不要把 http://电脑IP 当生产安装地址；localhost 的安全上下文例外只适用于电脑自己。

## 5. 备份与恢复

- 设置 → 导出敏感数据备份 JSON → 确认下载保存，妥善保管。文件未加密，系统云盘同步属于你所选择的文件保存方式。
- 设置 → 选择备份并预览恢复 → 核对记录数 → 先备份当前数据 → 输入“恢复” → 确认覆盖。
- 恢复是整份替换，不合并；校验、版本或事务失败不会清空原数据。预览后数据若发生变化需重新选择。
- 单份文件上限 2 MB；规范化本地记录限 1 MB，避免可保存却不可恢复。满额时阻止新增并保留旧数据，不自动裁剪历史。
- 建议每次集中记录后、更新前、更换手机 / 域名 / 安装环境前备份。不要仅依赖浏览器持久存储授权。
- 在其他设备恢复备份后逐项核对记录与参数，不上传到公开站点。

## 6. 日历提醒

设置保存提醒时间、开关和隐私文案，再导出 ICS。本轮预计开始、前三天准备、开始次日确认、预计经期结束记录确认，以及进行中经期的记录确认会按条件生成；过期事件跳过，逾期预测不会自动滚动到虚构周期。
ICS 包含本地浮动时间和 VALARM。导入后核对时区、事件时间、提醒与日历通知权限；跨时区可能改变解释，需重新检查。部分客户端可能忽略 VALARM。
从“文件”App 或 Safari 下载项尝试用系统日历支持的方式打开 .ics，按系统提供的“添加全部”导入到独立日历。若当前 iOS 文件预览不提供导入入口，请使用系统支持的其他打开方式；不要为了绕过限制上传真实 ICS 到公开文件站。
**ICS 导入后不会随 PWA 数据自动更新。**每次修改参数或经期后重新导出，先在日历里处理旧副本以免重复。稳定 UID 不保证所有客户端自动去重。
日历账户可能同步到 iCloud / Google 等服务，这是你导入时选择的账户行为。默认隐私标题是“个人日程提醒”，但日期及日历文件本身仍属于敏感信息。
没有真正的 PWA iOS 本地通知；不会宣称日历提醒已经可靠送达。

## 7. 更新策略

- 内容哈希生成缓存名 cyclemoon-shell-版本。新 Service Worker 必须完整预缓存后才进入等待；安装失败保留旧版。
- 打开设置 → 检查新版本。有更新时先保存当前表单并导出备份，再“应用更新并重新加载”。
- 不强制自动刷新当前编辑；默认也可关闭所有月相窗口再重开完成激活。
- 旧外壳暂保留，防止旧窗口找不到懒加载文件。新页面加载后，确认没有其他同源窗口且没有正在安装 / 等待的更新时，只清理旧 cyclemoon-shell 缓存。
- Service Worker 不读写 IndexedDB、不删除数据库、不缓存记录或备份。数据 schema 升级只补充已知字段；遇到未来版本拒绝降级，不重建或清空。
- 先在测试部署验收升级与恢复，再替换正式项目。离线缓存不是备份。
