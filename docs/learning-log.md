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
