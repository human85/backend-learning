# Mini SaaS 学习项目

## 项目定位

Mini SaaS 是本仓库的第一个完整后端应用，用连续业务场景学习 NestJS、HTTP、数据库、认证授权、Redis、测试、Docker 和部署。它不是“每个概念一个 demo”，而是用于观察知识如何在长期项目中组合。

## 当前状态

- 路径：`apps/mini-saas/`
- 技术栈：Node.js、TypeScript、NestJS 11、Jest
- 阶段：初始模板
- 已有行为：`GET /` 返回 `Hello World!`
- 数据库、认证、Redis：尚未接入

## 已完成

- 创建 NestJS 初始模板和基础测试。
- 验证单元测试、端到端测试、构建和 lint。
- 将应用迁入根级 pnpm workspace。

## 下一项应用课程

在完成 Monorepo 与 Workspace 基础后，从实际代码追踪 `GET /`：

1. `src/main.ts` 启动应用。
2. `AppModule` 注册 Controller 和 Service。
3. `AppController` 匹配 HTTP 请求。
4. `AppService` 返回结果并由 NestJS 响应客户端。

完成标准仍以 `docs/learning-progress.md` 的当前快照为准。
