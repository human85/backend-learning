# Render Docker 部署与线上验收

## 从 GitHub 到公网 API

Render 使用仓库根作为 Docker build context，读取 `apps/mini-saas/Dockerfile`：

```text
GitHub main
  -> Render BuildKit
  -> production Docker Image
  -> inject environment variables
  -> node dist/main.js
  -> HTTPS public URL
```

Monorepo 的 Root Directory 保持为空，因为 Dockerfile 需要复制根级 package.json、pnpm lockfile 和 workspace 配置。选择 Docker runtime 后，不再填写 Node Build Command 或 Start Command；构建步骤和默认启动命令由 Dockerfile 定义。

## Live 不等于业务验收通过

平台显示 Live 只证明 Container 启动并满足平台条件。最小线上验收还应覆盖：

- 公网 `/health`；
- 预期前端 Origin 的 CORS 预检；
- 注册与登录状态码；
- Session Cookie 的 Secure、HttpOnly 和 SameSite；
- 携带 Cookie 的 `/auth/me`；
- 受保护资源的创建、查询和删除；
- 注销后原 Cookie 失效；
- 数据确实写入远程 PostgreSQL，而不是 Container 文件系统。

测试数据应使用可精确识别的临时账号，完成后删除项目、Session 和用户，并查询计数确认清理结果。

## 免费实例边界

Render Free Web Service 会在空闲后休眠，下一次请求可能需要较长冷启动。它适合学习和演示，不代表正式生产可用性。API 状态不能保存在 Container 内存或本地磁盘；当前业务数据与 Session 都在 Neon，因此 Container 休眠和重建不应导致状态丢失。

环境变量保存在 Render 平台：NODE_ENV、DATABASE_URL、SESSION_SECRET 和 FRONTEND_ORIGIN。仓库、Docker Image、构建日志和测试输出都不应包含真实密钥。
