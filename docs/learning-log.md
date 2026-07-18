# 学习日志

本文件按时间正序追加，只记录发生过的学习和可验证结果。

## 2026-06-15｜建立学习目标

- 确认以当前 Mini SaaS 作为后端训练项目。
- 确认导师式协作：深入浅出、前端类比、概念落到代码、逐步纠偏。
- 初步路线包含数据库、认证、Redis、Docker、测试和部署。

## 2026-06-16｜后端请求的一生

- 学习了浏览器 → Controller → Service → Repository/ORM → Database → Response 的基本链路。
- 理解前端输入不可信，关键权限和业务规则必须由后端验证。
- 理解 Controller 负责入口，Service 负责业务，Repository 负责数据存取。
- 通过“免费用户最多创建三个项目”的例子串联各层，但未进行编码练习。

## 2026-07-18｜恢复项目上下文

- 从旧线程导出恢复了导师角色、学习目标和已接触知识。
- 确认当前代码仍是 NestJS 初始模板，没有业务功能。
- 创建中文 `AGENTS.md`，明确本项目以学习而非功能交付为中心。
- 初始化 Git 并完成首次提交；单元测试、端到端测试、构建和 lint 均通过。
- 建立 `docs/` 学习档案体系，用当前快照、路线图、日志、决策和专题笔记支持跨设备恢复教学上下文。
- 确认 Agent 可在形成完整、可验证的学习阶段后主动创建本地提交。
- 下一课确定为从实际代码追踪默认 `GET /` 请求。

## 2026-07-18｜迁移为后端学习 Monorepo

- 将仓库定位从单一 Mini SaaS 调整为可容纳多个后端学习项目的 `backend-learning`。
- 使用 pnpm workspace 作为轻量多项目管理机制，暂不引入 Nest CLI monorepo、Nx 或 Turborepo。
- 将现有 NestJS 应用迁入 `apps/mini-saas/`，并保留独立的依赖、配置和测试边界。
- 增加根级编排脚本、项目学习档案和 Monorepo 专题笔记。
- 重新生成 workspace 锁文件，确认依赖归属于 `apps/mini-saas` 而不是根项目。
- 根级构建、单元测试、端到端测试和 lint 全部通过。
- 当前需要学习者复述 Monorepo 与 Workspace 的区别，然后再回到 `GET /` 请求链路。

## 2026-07-18｜第一个新增接口与测试边界

- 学习者能够解释 Monorepo 与 pnpm Workspace、应用依赖归属以及根级测试与 `--filter` 测试的范围区别。
- 通过实际命令确认 pnpm 识别根 package 和 `@backend-learning/mini-saas`，并只在应用 package 中运行测试。
- 区分 `main.ts` 的应用启动阶段与 Controller、Service 的请求处理阶段。
- 新增 `GET /health`，由 Controller 匹配路由并委托 Service 返回 `{ "status": "ok" }`。
- 使用 `useValue` 将 Controller 测试中的真实 Service 替换为 mock，理解依赖注入如何支持隔离测试。
- 增加真实 Service 单元测试和 `/health` e2e 测试，理解 mock 测试与完整请求验证各自的覆盖边界。

## 2026-07-18｜DTO 与运行时输入校验

- 理解 TypeScript 类型和 DTO 只能描述期望结构，必须由 ValidationPipe 在运行时执行校验。
- 增加 `POST /projects` 和 `CreateProjectDto`，使用 `@IsString()` 与 `@IsNotEmpty()` 校验项目名称。
- 配置 `whitelist` 与 `forbidNonWhitelisted`，理解清理额外字段和明确拒绝额外字段的区别。
- 通过真实 HTTP 请求观察合法输入返回 `201`，错误类型、空名称和额外字段返回 `400`。
- e2e 首次运行暴露测试启动未执行 `main.ts`，随后提取共享 `configureApp()`，使生产和测试应用使用同一套全局管道配置。
- 当前接口只回显校验后的输入，没有数据库或持久化；下一课将其重构为独立 ProjectsModule。

## 2026-07-18｜项目领域 Feature Module

- 将项目创建行为从根 AppController 和 AppService 移入 `src/projects/`，按 feature 组织 DTO、Controller、Service 和测试。
- 新增 ProjectsModule，通过 `controllers` 注册 HTTP 入口，通过 `providers` 注册可注入的 ProjectsService。
- AppModule 使用 `imports: [ProjectsModule]` 将整个项目领域纳入应用，外部 `POST /projects` 合同保持不变。
- 理解未导入 ProjectsModule 会导致路由不存在并返回 `404`；未注册 ProjectsService 会导致 NestJS 无法解析 Controller 依赖并在启动阶段失败。
- 当前没有其他模块需要注入 ProjectsService，因此没有提前导出 provider。
