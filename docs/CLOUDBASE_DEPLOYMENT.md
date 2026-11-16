# CloudBase 静态托管评估与操作指南

官方文档核对日期：2026-11-16。未登录云平台、未开通环境、未购买、未部署。产品规则可能变化，操作时再次查看控制台。下面区分平台事实、工程建议与未验证事项。

## 是否适合本项目

CloudBase 能托管本应用的静态文件，不需要接入 CloudBase SDK、云数据库或登录服务；健康记录继续只存浏览器。本次不启用任何云端健康数据服务。

| 问题 | 核对结果与限制 |
| --- | --- |
| 免费额度 | 官方定价存在免费体验环境，3000 资源点/月；账号领取资格、兑换码及续期有条件，不是所有账号自动获得。免费环境不能开启超限按量，功能限制需在开通页逐项确认，包括能否启用所需静态托管/域名能力；本次未登录验证资格。不能承诺永久免费托管。 |
| 实名认证 | 中国站使用云产品需完成账号实名认证；个人可用个人认证，不要求为本项目购买企业认证。本人完成认证，本工具不处理身份材料。 |
| 默认域名 | 官方定位为开发测试，有访问频率、提示中间页等限制；当前文档指出生产浏览器访问应使用自定义域名。2025 年公告还记载非导航请求添加 attachment 的限制。不同创建时间与当前策略可能不同，不能假定 JS / manifest / SW 无障碍可用。 |
| iPhone Safari | HTTPS 地址可以尝试打开，但默认域名的提醒页、资源响应头和限流可能影响 Safari、安装及 SW。不能把“页面能打开”视为 PWA 长期可用或离线通过。真机未验证。 |
| 自定义域名 | 中国大陆托管/加速按官方要求准备已备案域名、DNS 权限及 HTTPS 证书；ICP 和域名实名是不同手续。域名、备案条件和证书资格由用户确认，不代购。 |
| 超额风险 | 免费环境当前不支持超限按量；额度耗尽/到期可能停服。升级付费后套餐、资源包、按量扣费及加速流量/请求费可能产生支出。设置额度与费用提醒、避免自动升级/按量开关；告警不等于强制费用上限。 |

依据：[定价与免费体验条件](https://buy.cloud.tencent.cn/price/tcb/overview)、[资源点说明](https://docs.cloudbase.net/quick-start/resource-point)、[账号实名认证](https://cloud.tencent.com/document/product/378/3629/)、[当前默认域名说明](https://docs.cloudbase.net/service/introduce)、[历史默认域名公告](https://cloud.tencent.com.cn/announce/detail/2119)。当前默认域名文档已说明续期机制变化，不能继续按旧公告承诺可反复续期。

## 授权之后的上传步骤（本次不执行）

1. 用户自行确认免费资格、静态托管能力、实名认证、环境地域、域名备案和总成本；确认后才创建或使用环境。不要直接转付费来绕过限制。
2. 本地依次运行 `npm run typecheck`、`npm run lint`、`npm test`、`npm run export:web`、`npm run package:web`、`npm run check:http`。准确 ZIP 见 V0.3.1_REPORT.md。
3. 在 CloudBase 控制台选择环境 → 静态网站托管 → 上传代码包/文件夹；上传 ZIP 内容，确保根目录直接有 index.html、sw.js、manifest.webmanifest、icons/、_expo/，不能再套 dist/ 外层。不要上传整个项目、备份、ICS、artifacts/ 或 Downloads。
4. 设置根索引 index.html。本次保留原 /calendar.html 等文件，同时添加 /calendar/index.html、/record/index.html、/insights/index.html、/settings/index.html，支持目录默认索引。导航刷新时应映射到对应 HTML，可用 /record/ 检查。若 /record 不自动匹配文件或跳转目录，则为该路径配置到目录的重定向；不要把 JS/图标的 404 一律改成首页。
5. 按官方域名入口绑定自定义域名、设置 CNAME、安装/选择证书并强制 HTTPS。证书价格与资格以控制台为准；HTTPS 首次访问无警告才继续，不绕过证书警告。
6. 检查所有资源保持同源、路径透传；依次请求 /、/settings/、/sw.js、/pwa-version.json、/icons/icon-192.png，以及 HTML 中真实 JS。应为 200，JS 为 JavaScript、PNG 为 image/png、manifest 为 application/manifest+json，SW 无中间页或 attachment，不被鉴权/反盗链误拦截。
7. 先仅录入虚构数据验收，包括四种宽度、刷新持久化、分享取消/下载、JSON 恢复、版本更新与离线；再按 MIGRATION.md 迁移私人数据。默认域名若不满足任一项，不作为正式 PWA 地址。

依据：[静态托管管理](https://docs.cloudbase.net/hosting/manage)、[自定义域名与 HTTPS](https://docs.cloudbase.net/service/custom-domain)、[缓存配置](https://docs.cloudbase.net/service/cache)。

## 缓存、CSP 与 PWA

- HTML（包含目录 index.html）、sw.js、pwa-register.js、pwa-version.json 采用不长期缓存/需重新验证策略；对 SW 与版本 JSON 推荐 no-store。不要给整个站点配置长期强缓存。hash 文件名 JS/CSS 可长期缓存，但更新需完整上传并保留必要旧资源。
- CloudBase 不应被假定识别 Cloudflare 的 `_headers` 文件。必须在实际网关/域名响应头配置中复现所需策略；以浏览器响应头为准。如环境不支持，记录差异并先停止正式迁移，而非宣称 CSP 已生效。
- CSP 生成值在 dist/_headers：script-src 同源和具体 inline hash、connect-src self、worker-src self。不添加远端 SDK，不扩大到任意来源。关闭平台注入的分析/外部脚本；若平台修改 HTML，需重新核对 CSP 和 SW 内容哈希，而不是直接移除安全策略。
- manifest id/start_url/scope 使用 `/`，资源为同源根绝对路径，因此换域名无需硬编码腾讯域名；仅支持域名根目录托管，不能直接放到 /cycle/ 子路径。
- SW 用相同来源静态文件缓存，完整资源哈希校验后才进入等待；新域名必须重新在线安装外壳。旧域名缓存不能跨域迁移。页面断网能打开前，不应迁移主要记录。
- 应用数据不上传；服务商仍会处理静态访问的 IP 等网络元数据。

## 默认域名不合适时的低成本选择

优先评估 **EdgeOne Pages 免费套餐＋自有域名**，纯静态功能符合本工程；中国大陆加速仍需备案域名。其默认项目/部署域名也存在限制：含大陆区域预览链接只有短时有效期，不含大陆区域的默认域名对大陆访问可能返回 401，因此同样不能把默认域名当长期 PWA 域名。官方依据：[免费套餐 FAQ](https://edgeone.cloud.tencent.com/pages/document/162936949996421120)、[区域/域名限制](https://edgeone.cloud.tencent.com/pages/document/162936836982489088)。

已有合规域名时，可比较免费静态套餐降低托管费；没有域名时仍可能有域名年费、备案接入条件等成本。本次未购买或验证账号资格。如果必须零新增支出，先保留已用的 Cloudflare 网站及离线备份，不承诺存在“零成本、无域名、永久稳定大陆 PWA”的替代品。
