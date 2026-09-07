# Backend Learning Lab

这是一个面向 Web 前端工程师的后端学习仓库。它通过多个可运行项目和小型实验，循序渐进地学习后端开发，而不是只追求完成某一个产品。

## 仓库结构

```text
apps/       可独立运行的完整项目
labs/       聚焦单一概念的最小实验（按需创建）
packages/   多个项目真正需要复用时才创建的共享包
docs/       学习进度、路线、日志、决策和专题笔记
```

当前 Mini SaaS 包含两个独立应用：

- `apps/mini-saas/`：NestJS API。
- `apps/mini-saas-web/`：React + Vite 浏览器客户端。

`apps/hono-drizzle/` 用于 Hono / NestJS、Drizzle / TypeORM 对照及数据库可靠性实验。Mini SaaS 承担真实业务、认证与部署；Hono 使用教学身份，按阶段收尾，避免重复维护两套完整系统。

pnpm 通过根目录的 `pnpm-workspace.yaml` 发现各个项目，并使用一份根级 `pnpm-lock.yaml` 锁定整个仓库的依赖版本。

## 开始使用

先按 [Mini SaaS API 说明](apps/mini-saas/README.md) 准备 PostgreSQL、环境变量与迁移。安装依赖后，在不同终端启动 API 和 Web：

```bash
pnpm install
pnpm dev:api
pnpm dev:web
```

常用根级命令：

```bash
pnpm build
pnpm test
pnpm test:e2e
pnpm lint
```

Hono 使用 `pnpm dev:hono` 启动，数据库配置与边界见 [Hono 项目档案](docs/projects/hono-drizzle.md)。根 `pnpm test` 不含 Hono 数据库集成测试；其命令为 `pnpm --filter @backend-learning/hono-drizzle test:integration`，当前会清理目标教学表，运行前先核实隔离测试库。

## 继续学习

第一轮最小全栈闭环已完成，第二轮按“可靠性实验收尾 → 排错与基础 CI → 陌生需求交付 → 按问题深化”推进。具体状态以文档快照为准，不以功能数量代表学习者掌握程度。

- [Agent 指导规则](AGENTS.md)
- [学习档案入口与恢复顺序](docs/README.md)
- [当前进度与下一课](docs/learning-progress.md)
- [阶段范围和验收条件](docs/roadmap.md)
- [学习方法与复测](docs/learning-method.md)

新 Agent 或新设备应先读指导规则，再按档案入口顺序恢复上下文，并与 Git 和实际代码核对。
