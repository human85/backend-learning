# Mini SaaS 学习项目

## 项目定位

Mini SaaS 是本仓库的第一个完整后端应用，用连续业务场景学习 NestJS、HTTP、数据库、认证授权、Redis、测试、Docker 和部署。它不是“每个概念一个 demo”，而是用于观察知识如何在长期项目中组合。

## 当前状态

- 路径：`apps/mini-saas/`
- 技术栈：Node.js、TypeScript、NestJS 11、Jest
- 阶段：NestJS 与 HTTP 基础
- 已有行为：`GET /` 返回 `Hello World!`；`GET /health` 返回 `{ "status": "ok" }`；`POST /projects` 校验名称并回显结果，但尚未持久化
- 数据库、认证、Redis：尚未接入

## 已完成

- 创建 NestJS 初始模板和基础测试。
- 验证单元测试、端到端测试、构建和 lint。
- 将应用迁入根级 pnpm workspace。
- 增加 `GET /health`，实践 Controller → Service → HTTP 响应链路。
- 使用 mock 隔离 Controller，分别通过 Service 单元测试和 e2e 验证真实实现与完整请求。
- 增加 `CreateProjectDto` 和全局 ValidationPipe，拒绝错误类型、空名称和未声明字段。
- 提取共享 `configureApp()`，确保生产启动与 e2e 使用相同的全局配置。

## 下一项应用课程

将当前项目创建行为重构为独立的 ProjectsModule：

1. 理解根 AppModule 与 feature module 的关系。
2. 将项目 Controller、Service、DTO 和测试放入 `src/projects/`。
3. 由 AppModule 导入 ProjectsModule。
4. 保持现有 HTTP 行为不变，暂不引入数据库。

完成标准仍以 `docs/learning-progress.md` 的当前快照为准。
