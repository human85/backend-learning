# Mini SaaS 学习项目

## 项目定位

Mini SaaS 是本仓库的第一个完整后端应用，用连续业务场景学习 NestJS、HTTP、数据库、认证授权、Redis、测试、Docker 和部署。它不是“每个概念一个 demo”，而是用于观察知识如何在长期项目中组合。

## 当前状态

- 路径：`apps/mini-saas/`
- 技术栈：Node.js、TypeScript、NestJS 11、Jest
- 阶段：NestJS 与 HTTP 基础
- 已有行为：`GET /` 返回 `Hello World!`；`GET /health` 返回 `{ "status": "ok" }`
- 数据库、认证、Redis：尚未接入

## 已完成

- 创建 NestJS 初始模板和基础测试。
- 验证单元测试、端到端测试、构建和 lint。
- 将应用迁入根级 pnpm workspace。
- 增加 `GET /health`，实践 Controller → Service → HTTP 响应链路。
- 使用 mock 隔离 Controller，分别通过 Service 单元测试和 e2e 验证真实实现与完整请求。

## 下一项应用课程

在已经理解输出链路的基础上，引入 HTTP 输入、DTO 和参数校验：

1. 理解为什么所有外部输入都不可信。
2. 区分路径参数、查询参数和请求体。
3. 使用 DTO 描述输入结构。
4. 通过 ValidationPipe 执行运行时校验。

完成标准仍以 `docs/learning-progress.md` 的当前快照为准。
