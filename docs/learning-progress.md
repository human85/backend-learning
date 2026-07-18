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
- 实践进度：仓库已迁移为 pnpm workspace；Mini SaaS 已新增 `GET /health`，并通过 Controller、Service 和 e2e 三个测试视角验证请求链路

## 已接触的知识

| 知识点 | 程度 | 证据或说明 |
| --- | --- | --- |
| 后端请求链路 | 理解中 | 已了解 Controller → Service → Repository/ORM → Database |
| 前后端职责边界 | 理解中 | 已理解前端负责体验、后端负责规则和校验 |
| Controller、Service、Repository 分工 | 理解中 | 已通过“创建项目”示例串联，但尚未编码 |
| Repository 名称与作用 | 理解中 | 已理解它抽象某类数据的存取入口 |
| Monorepo 与 pnpm Workspace | 理解中 | 已能解释两者区别、依赖归属和根级命令与 `--filter` 的范围 |
| NestJS 启动与请求阶段 | 理解中 | 已能区分 `main.ts` 启动应用与 Controller、Service 处理请求 |
| 依赖注入 | 理解中 | 已理解 Controller 不负责创建 Service，并观察了 `useValue` 测试替换 |
| 单元测试与 e2e | 理解中 | 已能根据 mock 和真实应用的执行边界判断测试结果 |

## 当前学习任务

通过 `GET /health` 巩固 Controller、Service、依赖注入和测试边界，理解同一行为为什么需要不同层次的验证。

## 下一步完成标准

- 能说明 `@Get('health')`、Controller 和 Service 在请求链路中的职责。
- 能解释 `provide: AppService` 与 `useValue` 如何替换测试依赖。
- 能区分 Controller 单元测试、Service 单元测试和 e2e 测试各自能发现的问题。
- 下一项新内容是 HTTP 输入、DTO 与参数校验。

## 困惑与阻塞

目前没有已记录的阻塞。开始下一课时应先询问学习者可用时间，以及希望进行概念讲解还是动手练习。
