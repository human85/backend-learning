# Mini SaaS 浏览器客户端

这是后端学习仓库中的 React + TypeScript + Vite 客户端，用于验证浏览器、API、Cookie、Session 与部署链路。当前页面围绕注册、登录、刷新恢复身份和注销；不把后端已有 Projects CRUD 等同于前端已具备完整项目管理界面。

## 从仓库根目录运行

先按 [API 说明](../mini-saas/README.md) 配置数据库、环境变量并执行迁移，再分别启动：

```bash
pnpm dev:api
pnpm dev:web
```

Vite 默认地址为 `http://localhost:5173`；实际端口以启动输出为准，后端 CORS Origin 应与之匹配。

## 请求与部署边界

- `src/lib/api.ts` 统一请求与错误处理，强制携带 Session Cookie；默认 API 为 `http://localhost:3000`。
- `src/features/auth/` 表达认证合同并使用 TanStack Query 管理服务端状态，界面复用 Tailwind CSS 与 shadcn/ui。
- `VITE_API_BASE_URL` 是构建时公开配置，不能存密钥。已有部署采用 `/api`，配合静态站点 Rewrite 到 API；设置变量本身不会创建代理规则。
- 浏览器验证应区分 HTTP 错误、网络/CORS 错误和 Cookie 未回传；前端只是体验与验收入口，权限由后端保证。

## 验证与学习定位

```bash
pnpm --filter @backend-learning/mini-saas-web test
pnpm --filter @backend-learning/mini-saas-web build
pnpm --filter @backend-learning/mini-saas-web lint
```

这些检查不能代替真实浏览器与部署验收。前端只增加当前后端课程必需的交互；下一课见 [学习进度](../../docs/learning-progress.md)，历史验收与实现状态见 [Mini SaaS 档案](../../docs/projects/mini-saas.md)。
