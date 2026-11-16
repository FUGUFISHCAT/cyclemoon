# GitHub Pages 自动部署

仓库：FUGUFISHCAT/cyclemoon。预期网址：`https://fugufishcat.github.io/cyclemoon/`。

## 你需要做的一次设置

1. 在 GitHub 仓库网页打开 **Settings → Pages → Build and deployment → Source → GitHub Actions**。不要选 Deploy from a branch，也不需要 gh-pages 分支。
2. 确认仓库允许运行 Actions。GitHub 免费账户使用 Pages 通常需公开仓库；若为私有仓库，请先查看账号支持，不要为此未经审查直接公开内容或购买套餐。
3. 本地配置提交后，在 GitHub Desktop 点击 **Push origin**（当前 master 分支）。此后推送 master 或 main 会自动测试、构建并发布。
4. GitHub 仓库 **Actions → Deploy CycleMoon to GitHub Pages** 查看进度；首次也可点 Run workflow。需要 build 与 deploy 都成功，不能只看上传完成。
5. 部署后确认 Pages 给出的网址，检查图标、五页导航、刷新、设置保存和离线。未实际运行云端工作流前不能声称线上部署通过。

流程使用 GitHub 内置临时 GITHUB_TOKEN/OIDC 权限，不需要你创建 PAT、保存密码或添加云密钥。只上传 dist 应用产物，生产数据没有进入构建。

依据：[GitHub Pages 发布源设置](https://docs.github.com/en/pages/getting-started-with-github-pages/configuring-a-publishing-source-for-your-github-pages-site)、[Pages 自定义工作流](https://docs.github.com/en/pages/getting-started-with-github-pages/using-custom-workflows-with-github-pages)、[Expo baseUrl](https://docs.expo.dev/versions/latest/config/app/)。

## 工程配置

- `.github/workflows/pages.yml`：Push → 历史扫描 → npm ci → TypeScript → ESLint → 测试 → Expo Web 导出 → PWA / HTTP 检查 → Pages artifact → 官方 deploy-pages。
- Actions 只为 Pages 构建设置 EXPO_PUBLIC_BASE_PATH=/cyclemoon。app.config.js 将它传给 Expo experiments.baseUrl，Router 和编译资源路径自动适配。未设置时依旧输出根路径版本，可继续用于现有 Cloudflare/其他托管。
- 自定义 HTML 的 manifest、apple-touch-icon、注册脚本同样带前缀；manifest id/start_url/scope 为 /cyclemoon/，所有图标使用对应子路径。
- 注册脚本按自身地址计算 scope；不会复用根路径或其他项目的 SW 注册。SW 只拦截 /cyclemoon/，缓存名加项目隔离，导航映射到相应 HTML；保留旧 hash 资源，不自动清理 IndexedDB。
- 目录 index.html 支持 GitHub Pages 的 /settings/ 等路径；`.nojekyll` 防止传统 Jekyll 忽略 `_expo`。缺失 JS 应返回404，不能把它当首页 HTML。
- GitHub Pages 不按 Cloudflare 的 `_headers` 配置响应头，不把本地 CSP 响应头检查等同 Pages 实际生效。线上响应头和缓存行为仍需首次部署验收。

## 本地复现

```powershell
npm run typecheck
npm run lint
npm test
$env:EXPO_PUBLIC_BASE_PATH='/cyclemoon'
npm run export:web
npm run check:pwa
npm run check:http
npm run serve:web
```

浏览器打开 `http://localhost:4173/cyclemoon/`。改回根路径构建前执行 `Remove-Item Env:EXPO_PUBLIC_BASE_PATH`，再重新运行 export:web。不要把子路径构建直接覆盖原根路径站点。本次没有推送或部署。

## 数据保护与换网址

数据库仍为 cyclemoon-local / v3，更新不删除数据库、不改变记录。当前 GitHub Pages 同源用户数据可继续回读；Cloudflare 与 github.io 不同源，历史记录不会自动迁移。先在原有入口导出未加密 JSON，在新入口预览后明确确认恢复，核对日期/数量/待确认状态/偏好，再刷新验证。原 Cloudflare 网站和浏览器数据继续保留，不要清除站点数据。

GitHub 同一用户名下不同项目共享 origin，IndexedDB 本身按 origin 隔离而非按路径；不要在同一 origin 托管不可信脚本。SW 作用域和缓存前缀隔离不能替代来源安全或文件备份。

## 本次验证

- 原有48项测试＋子路径 SW 导航/作用域测试：49项通过。
- TypeScript、ESLint、子路径生产构建与 PWA 检查通过。
- 61个 HTTP 路由/资源状态、字节、MIME、图标检查通过。
- 独立本地来源保存合成参数30/5后刷新保留；导航保持 /cyclemoon/settings；源站停止后新标签 /cyclemoon/settings/ 离线启动并回读参数。
- 对所有本地 Git refs 扫描162个历史文本 blob，未发现健康备份 JSON、敏感文件路径或已知密钥格式；历史 QA 截图为前述合成验收记录。模式扫描无法保证识别所有任意密码，不应把未来真实备份加入源码目录。
- 真正的 GitHub Actions 运行、线上 Pages、iPhone 主屏幕安装仍未验证，由你 Push 后验收。
