# Mini SaaS

这是后端学习仓库中的第一个完整应用，使用 NestJS 练习 HTTP、模块化、数据库、认证授权、Redis、测试和部署。

第一轮已完成 PostgreSQL 持久化、Session 认证、项目归属授权、测试、Docker 与历史部署验收；Redis 等仍是后续候选内容。当前实现边界见 [项目档案](../../docs/projects/mini-saas.md)，下一课见 [学习进度](../../docs/learning-progress.md)。后续在本应用练习排错、基础 CI 和陌生业务需求交付。

## 本地数据库

先确保 PostgreSQL 正在运行并创建开发数据库：

```bash
createdb mini_saas
cp apps/mini-saas/.env.example apps/mini-saas/.env
```

将 `.env` 中的 `YOUR_USER` 替换为本机 PostgreSQL 用户，然后执行已经提交的迁移：

```bash
pnpm --filter @backend-learning/mini-saas db:migration:run
pnpm --filter @backend-learning/mini-saas db:migration:show
```

真实 `.env` 不会提交；`.env.example` 只记录其他设备需要提供哪些配置。

e2e 使用独立测试数据库，避免清理测试数据时误删开发数据：

```bash
createdb mini_saas_test
cp apps/mini-saas/.env.test.example apps/mini-saas/.env.test.local
pnpm --filter @backend-learning/mini-saas db:migration:run:test
```

同样需要将 `.env.test.local` 中的 `YOUR_USER` 替换为本机 PostgreSQL 用户。

## 从仓库根目录运行

```bash
pnpm dev
pnpm build
pnpm test
pnpm test:e2e
pnpm lint
```

## 只操作当前应用

```bash
pnpm --filter @backend-learning/mini-saas start:dev
pnpm --filter @backend-learning/mini-saas test
```

应用默认监听 `http://localhost:3000`。
