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

成员/邀请的 schema 测试可单独运行：

```bash
pnpm --filter @backend-learning/mini-saas test:e2e --runInBand collaboration-schema
```

该测试优先读取环境变量 `DATABASE_URL`，否则读取 `.env.test.local`；仅接受本机 `mini_saas_test` 配置。它不修改这个数据库，而是连接同一服务器的 `postgres` 管理库，创建唯一命名的临时数据库，在其中执行迁移与约束测试，结束后删除。测试账号需要有 `CREATEDB` 权限；CI 的临时 PostgreSQL 账号满足要求。其他现有 e2e 仍会清理 `mini_saas_test`，所以运行完整 e2e 前仍需确认隔离环境。

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
