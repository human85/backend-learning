# Mini SaaS

这是后端学习仓库中的第一个完整应用，使用 NestJS 练习 HTTP、模块化、数据库、认证授权、Redis、测试和部署。

当前仍处于 NestJS 初始模板阶段。项目级学习状态记录在根目录的 `docs/projects/mini-saas.md`，全局学习进度记录在 `docs/learning-progress.md`。

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
