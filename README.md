# 月相 Cycle / CycleMoon

Expo SDK 58 + React Native + TypeScript 工程，当前版本 0.3.0。Windows 可开发；静态 PWA 可用 iPhone Safari 添加到主屏幕，无需购买 Apple Developer 会员或安装 IPA。本项目没有自动部署。

## 快速运行

本机已安装依赖：

```powershell
cd 'F:\新项目\月相'
npm run web
```

开发服务器用于开发；验收安装和离线必须使用下面的静态构建：

```powershell
npm run export:web
npm run serve:web
```

电脑访问 http://localhost:4173 。手机要使用 HTTPS 部署地址；手机访问电脑局域网 HTTP 地址不满足 Service Worker 安全上下文要求。
新机器先安装 Node 24 LTS，再 npm ci。检查命令：

```powershell
npm run typecheck
npm run lint
npm test
npx expo install --check
npx expo-doctor
```

## 已实现

五页导航、经期与身体状态增删改、IndexedDB 原子保存、周期经验估计、四类待办与带 VALARM 的 ICS 导出、JSON 敏感数据备份和预览恢复、Manifest、iPhone 图标、安全区域、Service Worker 静态外壳及版本更新。
记录、症状、备注和用户参数不发给服务器；没有广告、账号或分析 SDK。选中的日期只在内存传递，不写入 URL。公开托管服务仍会处理普通静态访问请求，不等于端到端匿名服务。
原生 SQLite、原生文件操作、expo-notifications 仅预留适配位置，尚未实现；原生保存会明确报错，不以内存替代持久化。

## 提醒与隐私

ICS 是一次性日历副本，PWA 修改不会自动更新已导入事件。日历导入、提醒保留及实际送达取决于系统日历；没有实现真正的 iOS 本地通知。
备份 JSON 未加密，包含敏感健康记录，勿上传公开服务器。日历可能同步到用户选定的 iCloud 等账户。隐私模式只弱化日历文案，不等于文件加密。
浏览器本地数据可能被系统回收；添加主屏幕和申请持久存储都不保证永不丢失，请定期备份。预测经验范围不是统计置信区间，不能用于可靠避孕。

## V0.3 最终验收

状态：待真机验收的发布候选版，未公开部署。41 项自动化测试、TypeScript、ESLint、Expo Doctor 20/20 与生产 Web 构建通过。升级前后完整备份比较一致。

- [最终报告](docs/V0.3_REPORT.md)
- [部署、回滚与发布清单](docs/RELEASE_CHECKLIST.md)
- [iPhone 真机清单与回归计划](docs/V0.3_TEST_PLAN.md)
- [隐私与安全边界](docs/SECURITY.md)

运行 npm run package:web 生成并逐文件验证 ZIP，不自动部署。V0.2 报告仅作为历史记录。

## 文档

本次已生成 [静态部署 ZIP](artifacts/cyclemoon-pwa-0.3.0-96454457403a4018.zip)。只上传该包或 dist，不上传浏览器下载的备份。iPhone 真机验收尚未完成。

- [免费部署、iPhone 安装、离线测试、更新备份](docs/PWA_DEPLOYMENT.md)
- [数据与迁移](docs/DATA_MODEL.md)
- [架构与原生迁移](docs/ARCHITECTURE.md)
- [产品需求](docs/PRD.md)
- [测试计划](docs/TEST_PLAN.md)
- [决策](docs/DECISIONS.md)
- [本次验收记录](docs/PWA_REPORT.md)
- docs/PHASE1_REPORT.md 是历史阶段一报告，当前能力以本页与 V0.3_REPORT 为准。

## 目录

src/app 路由与 Web HTML；src/features 页面；src/domain 纯函数、校验和备份协议；src/data Repository / IndexedDB / 原生适配预留；src/services 文件、PWA 状态、原生通知预留；public 静态安装资源；scripts 静态构建与本地服务器；tests 算法、恢复、Repository 与 SW 测试；eas.json 未来原生配置。
