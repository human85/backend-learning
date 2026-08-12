# Hono + Drizzle 对照项目

## 项目定位

这个项目用与 Mini SaaS 相同的后端问题，对照观察 Hono 与 NestJS、Drizzle 与 TypeORM 的抽象差异。第一步只实现一个最小 Projects 纵向切片，避免同时复制完整认证、数据库和部署架构。

## 当前状态

- 路径：`apps/hono-drizzle/`
- 技术栈：Node.js、TypeScript、Hono、Zod、Vitest；Drizzle 尚未接入
- 阶段：显式请求链路已完成，下一步把内存 Repository 替换为 Drizzle + PostgreSQL
- 启动：从仓库根目录运行 `pnpm dev:hono`，默认监听 `3001`

## 已完成

- 使用 `@hono/node-server` 把 Hono 的 Fetch handler 接到 Node.js HTTP Server。
- 使用显式函数调用组装 `Repository → Service → Hono App`，没有 Module 和依赖注入容器。
- 增加 `GET /health`、`GET /projects` 和 `POST /projects`。
- 增加教学用鉴权 middleware：只接受 `Authorization: Bearer learning-session`，并把可信 `userId` 写入 Hono Context。它只用于观察执行顺序，不是生产认证方案。
- 使用 Zod 与 `@hono/zod-validator` 校验创建输入，并严格拒绝额外字段。
- 使用内存 Repository 隔离数据库变化点；路由和 Service 不需要知道数据当前保存在数组还是 PostgreSQL。
- 通过 HTTP 级测试证明执行顺序：未登录的无效请求先返回 `401`；已登录的无效请求返回 `400` 且最终 handler/Service 不执行；有效请求把清理后的输入和可信 userId 传给 Service。

## NestJS 对照

| NestJS               | 当前 Hono 实现                         |
| -------------------- | -------------------------------------- |
| Controller decorator | `projects.get()` / `projects.post()`   |
| Guard                | `requireDemoSession` middleware        |
| Pipe + DTO           | Zod schema + validator middleware      |
| Service Provider     | 普通 `createProjectsService()` 函数    |
| Repository Provider  | 显式传入的 `ProjectsRepository`        |
| AppModule / DI 容器  | `index.ts` 中可见的函数调用与参数传递  |
| Nest 测试应用        | Hono `app.request()`，无需监听真实端口 |

## 下一步

1. 使用 Drizzle 定义 Projects 表 schema。
2. 生成并阅读 migration SQL，再应用到独立的开发数据库。
3. 新增 Drizzle Repository，实现现有 `ProjectsRepository` 接口。
4. 保持路由、Service 和 HTTP 测试行为不变，验证只替换数据访问层。
