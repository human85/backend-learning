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
- 实践进度：Mini SaaS 已实现 `GET /health` 和带 DTO 校验的 `POST /projects`；能够通过单元测试、e2e 和真实 HTTP 请求观察完整链路

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
| DTO 与运行时校验 | 理解中 | 已能区分 TypeScript 类型描述与 ValidationPipe 的实际校验职责 |
| 白名单输入 | 理解中 | 已理解 `whitelist` 清理字段、`forbidNonWhitelisted` 拒绝额外字段 |

## 当前学习任务

理解 NestJS feature module 的作用，将暂存在根 AppController/AppService 中的项目创建行为重构为独立 ProjectsModule。

## 下一步完成标准

- 能解释为什么项目领域不应长期堆在根 AppController 和 AppService 中。
- 能说明 ProjectsModule 如何注册自己的 Controller 和 Service。
- 完成移动后保持 `POST /projects` 的行为和测试不变。
- 暂不接入数据库，先建立清晰的领域边界。

## 困惑与阻塞

目前没有已记录的阻塞。开始下一课时应先询问学习者可用时间，以及希望进行概念讲解还是动手练习。
