# GitHub Actions npm ci 404 修复

日期：2026-11-16。未推送、未部署、未修改健康记录或数据库。

## 已确认原因

官方 npm registry 对 regenerate-unicode-properties@10.3.1 返回 E404，版本列表截至核对时只到 10.3.0。官方 regexpu-core@6.5.4 元数据要求该依赖为 ^10.3.0；项目锁文件却写成 ^10.3.1，并锁定不存在的 10.3.1 tarball。

本机 npm registry 为 https://registry.npmjs.org/，strict-ssl 为 true；不是换镜像或关闭 SSL 可解决的问题。此次错误是当前不可解析的锁文件版本与下载地址，不把它作为临时网络故障处理。

## 最小修改

仅修正 package-lock.json 三处：

- regenerate-unicode-properties version → 10.3.0。
- resolved → https://registry.npmjs.org/regenerate-unicode-properties/-/regenerate-unicode-properties-10.3.0.tgz。
- regexpu-core 对它的依赖范围 → ^10.3.0，与官方包元数据一致。

integrity 已从官方元数据核对，与原校验值一致，保持不变。没有手工伪造校验和、删除依赖、跳过脚本/可选依赖或移除功能；没有修改 package.json、npm registry、SSL 配置和部署流程。

## 验证方式

使用系统临时目录中的全新工程副本，不复制现有 node_modules；另建空 npm cache，显式指定官方 registry 执行 npm ci --no-audit --no-fund。日志中目标 tarball 为 HTTP 200、cache miss，并接受正常 integrity 校验。

Windows / Node 24.19.0 / npm 11.17.0 全新环境结果：

- npm ci：成功，764 个包；新缓存，不复制已有 node_modules。
- TypeScript、ESLint：通过。
- 现有自动化测试：49/49 通过。
- EXPO_PUBLIC_BASE_PATH=/cyclemoon 的生产 Web 构建：通过。
- PWA 检查与61个 HTTP 路由/资源检查：通过。

本次构建标识 8b82d021fdc36eb6，与此前正确安装依赖时的 Pages 产物一致；没有应用功能更改。GitHub Ubuntu runner 需用户 Push 后由 Actions 实际验证，不能把 Windows 本地测试写成云端已通过。

## 用户下一步

GitHub Desktop 点击 Push origin；随后在仓库 Actions 中查看最新的 Deploy CycleMoon to GitHub Pages。它会用新锁文件重跑 npm ci、检查及部署。不必清除浏览器数据或健康记录，也不必删除 GitHub npm 缓存。若没有新的 push 触发运行，可手动 Run workflow；直接重跑旧提交仍会使用旧锁文件。
