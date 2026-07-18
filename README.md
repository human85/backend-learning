# Backend Learning Lab

这是一个面向 Web 前端工程师的后端学习仓库。它通过多个可运行项目和小型实验，循序渐进地学习后端开发，而不是只追求完成某一个产品。

## 仓库结构

```text
apps/       可独立运行的完整项目
labs/       聚焦单一概念的最小实验（按需创建）
packages/   多个项目真正需要复用时才创建的共享包
docs/       学习进度、路线、日志、决策和专题笔记
```

当前项目是 `apps/mini-saas/`。pnpm 通过根目录的 `pnpm-workspace.yaml` 发现各个项目，并使用一份根级 `pnpm-lock.yaml` 锁定整个仓库的依赖版本。

## 开始使用

```bash
pnpm install
pnpm dev
```

常用根级命令：

```bash
pnpm build
pnpm test
pnpm test:e2e
pnpm lint
```

新 Agent 或新设备应先阅读 `AGENTS.md` 和 `docs/learning-progress.md`，再结合 Git 与实际代码继续教学。
