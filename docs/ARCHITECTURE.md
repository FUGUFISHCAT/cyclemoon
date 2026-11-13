# 架构（0.2.0）

Expo SDK 58 + React Native + TypeScript strict；Expo Router 五页，保留原生工程。Web 静态导出，Windows 开发，Safari 主屏幕作为当前分发方式。

## 分层

app → features → components / domain / store。
domain 包含日历日运算、校验与备份、预测、提醒规划和 ICS 序列化，纯函数不依赖 React 或设备 API。
use-data-store 持有异步状态和数据库快照，Repository 是事实来源；保存只在事务完成后更新 UI。其他窗口收到的 BroadcastChannel 消息只有 changed，不携带记录；focus / visibility 重新读取本地快照，事务 revision 仍防止并发覆盖。
Web create-repository.web → IndexedDB；原生 create-repository.native → 明确未实现的 SQLite 适配。
文件下载 / 选择由 .web 文件提供；原生不假装支持。日期选择通过会话内存传递，不在 URL 暴露健康日期。

## PWA

+html.tsx 提供 viewport-fit=cover、主屏幕 meta、Manifest、apple-touch-icon 和 safe-area CSS；系统主题与 RN 基础组件沿用。
public 放公开且无用户数据的静态资源。export:web 先 Expo 静态导出，再构造静态文件列表，计算内容哈希并生成 SW。dist 是唯一部署目录。
SW 只缓存构建时清单中的应用资源，导航映射到对应静态 HTML；无运行时记录缓存、无 IndexedDB 访问。新版本等待明确应用或所有旧窗口关闭，失败保留旧版。单窗口新页面再清理旧外壳，不删数据库。详见 PWA_DEPLOYMENT。
没有服务端 API、注册、广告、分析或健康数据云同步。普通静态托管仍会接收页面 / 资源请求与常规访问元数据。

## 预测与提醒

最多最近六个有效间隔（15–90 天）取中位数；历史不足用明确保存的用户参数；无输入则无预测。不规律最低展示 ±7 天经验范围，其余最低 ±3 天，历史偏差会扩大范围。不是统计置信度或医学模型。
不根据逾期自动构造未来周期。排卵附近仅用中心估计前 18–12 天粗略展示，不能用于避孕。
提醒计划是派生数据，不写入真实记录。四类事件以本地浮动时间生成 ICS / VALARM，文件无原始症状与备注；用户日历导入是独立副本，无法自动重排。
原生 notifications.native.ts 留有 replaceFuture 接口，尚无权限或调度调用。

## EAS 与未来原生

app.json 配置 iOS Bundle Identifier app.cyclemoon.personal（未来正式构建前按实际身份确认）、eas.json 预留 development / preview / production。
本次未安装 development client、未运行 EAS Build、未申请 Apple 会员或签名。未来开发构建需接入 expo-dev-client、真实 SQLite / 文件 / 通知适配并做真机验证；这些配置不意味着免费生成可装 iPhone IPA。
PWA → 原生迁移：

1. 用户在原 HTTPS 来源导出 JSON 到自己的文件位置。
2. 原生版通过文档选择器读取，调用同一 importBackup / validateData。
3. 预览记录数和覆盖策略，先备份当前原生数据。
4. SQLite 迁移就绪后事务写入所有记录；失败回滚。验证笔数、日期、症状及备注。
5. 预测重算，通知需原生权限后重新规划；不导入 ICS 事件或旧设备通知 ID。
6. 成功确认前保留 PWA 与备份，不要求云中转或跨沙箱直接访问。

生活日历未来可通过版本化 DTO / ICS 适配，真实记录与预测来源必须区分。
