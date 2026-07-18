# 当前学习进度

> 这是新 Agent 恢复教学上下文时首先读取的状态快照。

## 基本信息

- 最近更新：2026-07-18
- 学习者背景：Web 前端工程师
- 学习目标：通过真实 Mini SaaS 项目系统学习后端，逐步具备全栈开发能力
- 教学偏好：中文讲解；先讲原因再讲术语；使用前端概念类比；小步实践；区分“能运行”和“工程化”

## 当前阶段

- 阶段：工程组织与 NestJS 基础
- 状态：进行中
- 当前焦点项目：`apps/mini-saas/`
- 实践进度：仓库已迁移为 pnpm workspace，根级命令验证通过；Mini SaaS 仍为 NestJS 初始模板，尚未开发业务功能

## 已接触的知识

| 知识点 | 程度 | 证据或说明 |
| --- | --- | --- |
| 后端请求链路 | 理解中 | 已了解 Controller → Service → Repository/ORM → Database |
| 前后端职责边界 | 理解中 | 已理解前端负责体验、后端负责规则和校验 |
| Controller、Service、Repository 分工 | 理解中 | 已通过“创建项目”示例串联，但尚未编码 |
| Repository 名称与作用 | 理解中 | 已理解它抽象某类数据的存取入口 |
| Monorepo 与 pnpm Workspace | 刚接触 | 正在通过仓库迁移学习，尚待学习者复述和独立操作 |

## 当前学习任务

通过本次迁移理解 Git 仓库、Monorepo、pnpm Workspace 和 workspace package 的区别，并学会从根目录定位、安装和运行 `apps/mini-saas/`。

## 下一步完成标准

- 能用自己的话说明 Monorepo 和 pnpm Workspace 不是同一个概念。
- 能解释根 `package.json`、`pnpm-workspace.yaml` 和应用 `package.json` 各自负责什么。
- 能使用 `pnpm --filter @backend-learning/mini-saas test` 只操作当前应用。
- 完成后回到默认 `GET /` 请求链路课程。

## 困惑与阻塞

目前没有已记录的阻塞。开始下一课时应先询问学习者可用时间，以及希望进行概念讲解还是动手练习。
