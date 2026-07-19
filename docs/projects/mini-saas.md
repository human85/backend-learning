# Mini SaaS 学习项目

## 项目定位

Mini SaaS 是本仓库的第一个完整后端应用，用连续业务场景学习 NestJS、HTTP、数据库、认证授权、Redis、测试、Docker 和部署。它不是“每个概念一个 demo”，而是用于观察知识如何在长期项目中组合。

## 当前状态

- 路径：`apps/mini-saas/`
- 技术栈：Node.js、TypeScript、NestJS 11、Jest
- 阶段：NestJS 与 HTTP 基础
- 已有行为：`GET /` 返回 `Hello World!`；`GET /health` 返回 `{ "status": "ok" }`；项目接口支持进程内创建、列表和按 ID 查询，不存在时返回 `404`
- 数据库、认证、Redis：尚未接入

## 已完成

- 创建 NestJS 初始模板和基础测试。
- 验证单元测试、端到端测试、构建和 lint。
- 将应用迁入根级 pnpm workspace。
- 增加 `GET /health`，实践 Controller → Service → HTTP 响应链路。
- 使用 mock 隔离 Controller，分别通过 Service 单元测试和 e2e 验证真实实现与完整请求。
- 增加 `CreateProjectDto` 和全局 ValidationPipe，拒绝错误类型、空名称和未声明字段。
- 提取共享 `configureApp()`，确保生产启动与 e2e 使用相同的全局配置。
- 将项目 DTO、Controller、Service 和单元测试迁入独立 ProjectsModule，由 AppModule 统一导入。
- 在 ProjectsService 中增加内存数组和顺序 ID，学习者亲自完成 `GET /projects` Controller 路由。
- 通过 Service 单元测试和同一应用内的 e2e 请求验证创建、保存和列表查询。
- 增加 `GET /projects/:id`，使用 ParseIntPipe 转换路径参数，并由 Service 对不存在的项目抛出 NotFoundException。
- 通过代码审查推理确认单元测试绕过 HTTP 参数转换，只有 e2e 能发现缺失 ParseIntPipe 的真实链路问题。

## 下一项应用课程

完成进程内项目 CRUD：

1. 增加 UpdateProjectDto 和 `PATCH /projects/:id`。
2. 增加 `DELETE /projects/:id`，明确成功响应状态码。
3. Service 实现更新和删除规则，并复用不存在项目的 `404` 行为。
4. 使用单元测试与 e2e 覆盖成功和失败路径。

完成标准仍以 `docs/learning-progress.md` 的当前快照为准。
