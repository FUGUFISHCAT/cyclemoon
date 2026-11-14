# V0.3.0 发布检查与操作

当前状态见 V0.3_REPORT.md。没有公开部署授权；本次仅本地构建和打包。

## 本地门禁

- [x] 原有工程审查、V0.2 Git 检查点，无真实备份或密钥入库
- [x] TypeScript、ESLint、自动化测试、Expo 依赖兼容检查
- [x] 静态 Web 生产构建、manifest / 图标 / hydration / 路由文件检查
- [x] 更新策略不访问或主动删除 IndexedDB
- [x] 事务失败、升级、备份恢复、旧版资源兼容测试
- [ ] iPhone Safari / 主屏幕安装、键盘、安全区域实测
- [ ] iPhone 飞行模式冷启动、离线写入、退出重开验证
- [ ] iPhone JSON 恢复、ICS 日历导入和实际提醒验收
- [ ] 用户明确授权公开部署
- [ ] 线上 HTTPS、响应头、路由刷新、版本更新和回滚验收

## Windows 构建与 ZIP

```powershell
cd 'F:\新项目\月相'
npm ci
npm run typecheck
npm run lint
npm test
npm run export:web
node scripts/check-pwa.mjs
npm run package:web
npm run serve:web
```

只把 dist 内部内容作为 ZIP 根目录，index.html 应直接处于根目录。package:web 会校验目录、生成带版本 / 内容标识的 ZIP 和 SHA-256 摘要；生成结果路径见报告。构建不读取浏览器数据库，不自动部署。检查 dist 不含备份、密钥、数据库、QA 截图或报告。

## 获授权后的 Cloudflare Pages 操作

1. 用户自行登录 Cloudflare → Workers & Pages → Pages → Direct Upload，使用免费 pages.dev 域名，无需付费会员或域名。
2. 上传通过检查的 ZIP / dist 文件夹。首次建立项目后，更新始终使用同一项目与正式来源；不要将预览域名误当正式数据来源。
3. 核对 HTTPS 无证书警告，不绕过警告。确认 /sw.js 的 JS MIME、no-store / no-cache，manifest MIME，HTML 和应用路由刷新返回正确页面，JS 路径不被错误重写为 HTML。
4. 用响应头面板确认 CSP、nosniff、Referrer-Policy、Permissions-Policy 实际生效；确认没有外部广告 / 分析请求。
5. 五页直接访问和刷新都应恢复导航与数据；未知地址显示合理错误。工程要求域名根路径，不支持未经配置的子目录托管。
6. 首次打开设置等缓存完整，然后在测试设备验证离线。再完成 V0.3_TEST_PLAN.md 的 iPhone 真机步骤，记录证据。

官方步骤：[Direct Upload](https://developers.cloudflare.com/pages/get-started/direct-upload/)、[Headers](https://developers.cloudflare.com/pages/configuration/headers/)。免费额度和界面以官方当前信息为准；本工程不依赖新增付费服务。

## 更新、回滚、数据迁移

- 更新前保存草稿并下载 JSON，确认文件可用；只替换同源静态文件。新版本下载和哈希核验全部完成后进入等待；设置中明确确认后才重新加载。
- 不强制刷新其他窗口；保存完草稿后关闭重开。新版继续支持旧 JS 缓存，保留旧外壳；不主动清除 IndexedDB。浏览器缓存仍可能被系统回收。
- 资源下载失败 / 内容不匹配：保留旧版，联网后点“检查新版本”重试。缓存被回收且启动失败时联网重开；不要删除站点数据来修复外壳。
- Cloudflare Pages 项目 Deployments 中选择已知正常的生产部署并执行 Rollback，按[官方回滚步骤](https://developers.cloudflare.com/pages/configuration/rollbacks/)。浏览器须联网检查、接受回滚对应的 worker 或关闭所有窗口重开，不能保证已离线的设备立刻回滚。
- V0.3 内部 IndexedDB 版本及 snapshot schema 仍为 2，V0.2 的现有记录无需破坏性迁移。未知库 / 更高版本拒绝降级，不清空。V0.2 不能读取新 v3 备份；新备份应使用 V0.3 或更高兼容版本恢复。
- 更换域名、协议、手机、浏览器或 Safari / 主屏幕环境时：旧环境导出 → 新环境导入预览 → 核对记录、参数与提醒 → 确认无误后保留独立备份。域名更改不会自动移动 IndexedDB。
- 未来原生 App 复用 JSON 协议，在原生 Repository 事务内迁移。Bundle Identifier 与 EAS 配置继续保留；当前没有购买开发者会员或发起 EAS 云构建。
