# PWA 0.2.0 交付与验收记录

日期：2026-11-13。未部署、未购买服务、未创建 Apple / EAS / Cloudflare 账户或签名。

## 交付物

- 当前项目根目录仍是 Expo / React Native 工程；expo 58.0.25、expo-sqlite 58.0.17 与 SDK 兼容。
- 静态目录：dist，版本 e050cb8c9eeb0cc6。
- 可直接用于 Pages Direct Upload 的公开应用 ZIP：artifacts/cyclemoon-pwa-0.2.0-e050cb8c9eeb0cc6.zip（431,662 bytes）。
- ZIP 只来自 dist，不含本地 IndexedDB、浏览器下载的备份、ICS 或测试截图；构建产物中未发现 QA 合成记录文本。
- [窄屏截图](qa/pwa-desktop-narrow.png)来自电脑内置浏览器，含明确用于验收的合成样例，**不是 iPhone 真机截图，也不是新用户默认数据**。

## 已验证

| 检查                       | 实际结果                                                                                                                                                    |
| -------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------- |
| npm run typecheck          | 通过                                                                                                                                                        |
| npm run lint               | 通过                                                                                                                                                        |
| npm test                   | 30/30，通过周期、备份、ICS、IDB 事务 / 迁移、SW 策略测试                                                                                                    |
| npx expo install --check   | Dependencies are up to date                                                                                                                                 |
| npx expo-doctor            | 20/20 通过                                                                                                                                                  |
| npm ci --dry-run --offline | 锁文件一致性通过；不是额外宣称 F 盘全新安装性能正常                                                                                                         |
| npm run export:web         | 项目根目录通过，9 个 Web bundle、7 个静态路由                                                                                                               |
| node scripts/check-pwa.mjs | standalone Manifest、180px iPhone 图标、45 个本地缓存资源、五页交互脚本有效                                                                                 |
| node --check dist/sw.js    | 通过                                                                                                                                                        |
| Windows 静态服务           | npm run serve:web，localhost:4173 返回 HTTP 200；浏览器验收使用同源 localhost:4174                                                                          |
| 窄屏浏览器五页             | 首页、设置、记录、日历、洞察已实际打开，未捕获页面 error 日志                                                                                               |
| 实际本地保存 / 刷新        | 保存 30 天 / 5 天 / 不太规律参数、2026-11-05 至 11-09 合成经期、中文 / emoji / 多行备注；刷新后保留                                                         |
| 实际 JSON 文件流程         | 浏览器下载 → 文件选择 → 1 条经期 / 1 天身体记录预览 → 明确确认恢复，成功；下载内容另用脚本核对                                                              |
| 实际 ICS 下载              | 文件包含 4 个 VEVENT 和 4 个 VALARM；不是日历客户端导入或送达测试                                                                                           |
| 实际离线                   | 停止 4174 静态服务器，HTTP 探测 000 后浏览器仍可重载、读记录；离线新增 2026-11-12 记录并刷新后保留                                                          |
| 实际 SW 更新               | 从临时同盘构建切换到根目录新版，检测到等待更新，应用后 DOM 加载 entry-94cd5a90fd1bd4f2f75b9d11e1cc9630.js，新旧构建不同；原经期、两天身体记录与参数全部保留 |
| 健康日期不进 URL           | 日历选 2026-11-12 后进入记录，表单日期正确，URL 仍为 /record，无日期查询参数                                                                                |
| 原生 JS 打包               | Android 1152 modules、iOS 1158 modules 导出通过，仅说明平台打包保留可用，不代表原生持久化或设备验收                                                         |

Repository 自动化使用 fake-indexeddb；另外完成了上述真实桌面浏览器 IndexedDB 读写。SW 自动化使用隔离运行环境验证缓存失败保留旧版、多窗口保护、静态离线导航与只删旧外壳缓存；另外完成真实桌面浏览器停止服务器与版本更新测试。两类证据不混同。

## 明确未验证

- 未连接用户 iPhone：Safari 添加主屏幕、standalone 冷启动、图标、真实安全区、飞行模式冷启动 / 离线保存、Safari 系统回收行为均为待验收。
- iPhone JSON 文件交接、ICS 导入、VALARM 是否保留、系统日历提醒实际送达待验收。
- 未测试所有 iOS 版本、系统深色与大字号 / VoiceOver。
- 未部署到 Cloudflare Pages，未验证实际公网 HTTPS 配置。
- 原生 SQLite、原生文件适配、真正的 iOS 本地通知、EAS 原生构建和应用级加密未实现；预留位置不算功能完成。

## 环境问题与处理

阶段一留下的跨盘 node_modules 联接使 Windows Web 导出尝试生成包含 C: 的资源目录，首次导出失败。本次复制完整依赖后，根目录 node_modules 已恢复为普通本地目录，正式导出成功；项目不再需要该 C 盘缓存才能运行。
临时 C 盘构建用于并行界面验收，最终静态产物、ZIP、原生打包均来自项目根目录。原跨盘联接重命名为 .external-deps-link，连同之前 .incomplete-node-modules\*、cycle 残留都已忽略，不属于源代码或部署目录。
初版自定义 +html 未接入 SDK 58 的 headNodes / bodyNodes，浏览器验收暴露无样式、无交互。按官方 useServerDocumentContext 修正，并增加构建脚本的交互脚本检查；修正后重新构建和验收。
Node MODULE_TYPELESS_PACKAGE_JSON、工具环境颜色变量提示为非阻断警告。当前兼容 Expo ESLint 配置的 ESLint 9 有上游维护周期提示；未强行跨大版本升级。

## 主要文件变更

- PWA：src/app/+html.tsx、public/manifest.webmanifest、public/pwa-register.js、public/\_headers、public/icons。
- 构建：scripts/build-pwa.mjs、service-worker.mjs、check-pwa.mjs、serve-web.mjs；package.json / lock。
- 数据：src/domain/model.ts、dates.ts、backup.ts；src/data/repository.ts、indexeddb.ts、各平台 create-repository / repository 适配；src/store/use-data-store.ts。
- 估计与提醒：src/domain/prediction.ts、reminders.ts；src/services/files.web.ts、pwa-status.web.tsx、notifications.native.ts 及平台占位。
- 页面：五个 feature 页面、src/components/form.tsx、data-status.tsx、ui.tsx、根导航、会话日期选择。
- 原生：app.json Bundle Identifier、eas.json、.easignore。
- 测试：backup、prediction、reminders、repository、sw 测试与 helper，原 calendar 测试保留。
- 文档：README、PRD、ARCHITECTURE、DATA_MODEL、TEST_PLAN、DECISIONS 更新；新增 PWA_DEPLOYMENT、PWA_REPORT 与 QA 截图。

## 下一步

ZIP SHA-256：42bb5522543782eb22c67ac2a5a26aad875844f74f319ed7a1105cc20a41d667；已检查归档含 48 个条目，index.html 位于根目录。本次本地服务与测试标签页已关闭，使用时重新运行 serve:web。

按 PWA_DEPLOYMENT 将公开应用 ZIP 手动部署到免费 HTTPS 来源，再按指南在自己的 iPhone 验收。首次使用新来源为空数据，浏览器合成验收记录不在发布包内。正式录入前先完成一次导出恢复测试，更新前备份。
