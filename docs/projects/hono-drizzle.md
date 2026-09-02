# Hono + Drizzle 对照项目

## 项目定位

这个项目用与 Mini SaaS 相同的后端问题，对照观察 Hono 与 NestJS、Drizzle 与 TypeORM 的抽象差异。第一步只实现一个最小 Projects 纵向切片，避免同时复制完整认证、数据库和部署架构。

## 当前状态

- 路径：`apps/hono-drizzle/`
- 技术栈：Node.js、TypeScript、Hono、Zod、Drizzle ORM、Drizzle Kit、node-postgres、Vitest
- 阶段：最小 Drizzle + PostgreSQL 纵向切片已完成
- 启动：从仓库根目录运行 `pnpm dev:hono`，默认监听 `3001`

## 已完成

- 使用 `@hono/node-server` 把 Hono 的 Fetch handler 接到 Node.js HTTP Server。
- 使用显式函数调用组装 `Repository → Service → Hono App`，没有 Module 和依赖注入容器。
- 增加 `GET /health`、`GET /projects` 和 `POST /projects`。
- 增加教学用鉴权 middleware：只接受 `Authorization: Bearer learning-session`，并把可信 `userId` 写入 Hono Context。它只用于观察执行顺序，不是生产认证方案。
- 使用 Zod 与 `@hono/zod-validator` 校验创建输入，并严格拒绝额外字段。
- 第一步先用内存 Repository 隔离数据库变化点；路由和 Service 不需要知道数据当前保存在数组还是 PostgreSQL。
- 通过 HTTP 级测试证明执行顺序：未登录的无效请求先返回 `401`；已登录的无效请求返回 `400` 且最终 handler/Service 不执行；有效请求把清理后的输入和可信 userId 传给 Service。
- 使用 Drizzle schema 定义 `projects` 表：数据库生成 identity ID，名称为 `varchar(100) NOT NULL`，owner ID 为 `integer NOT NULL`。
- 使用 Drizzle Kit 从 TypeScript schema 生成并提交可审查的 migration SQL，再将它执行到独立的本机 `hono_drizzle` 数据库；没有使用 `push` 跳过 migration 文件。
- 新增 Drizzle Repository，通过 `insert ... returning` 创建项目，通过 `where owner_id = ... order by id` 查询当前用户项目。
- `projects.routes.ts`、`projects.service.ts` 和 `ProjectsRepository` 接口保持不变；只替换 Repository 实现并在 `index.ts` 选择它，验证显式依赖边界。
- 数据库集成测试通过完整 HTTP pipeline 创建并读回项目，随后清空测试数据；真实 Node Server 也完成相同的 `POST → GET` 验证。
- 资源归属集成测试同时写入用户 1 与用户 2 的项目，再以用户 1 身份查询；故意删除 `where owner_id = 1` 时测试如期失败，恢复后通过，证明测试能捕获越权回归。
- 增加 `idempotency_records` 表和 Drizzle Repository：以 `(user_id, operation, idempotency_key)` 联合唯一索引保留一次逻辑请求，保存请求哈希、处理状态和原始响应；集成测试验证重放、错误复用、跨用户/跨操作隔离和并发 reservation。
- 将幂等能力接入 `POST /projects`：认证和 Zod 校验通过后，带 `Idempotency-Key` 的请求在同一数据库事务中完成 reservation、项目插入和响应保存；重试返回保存的原始响应，同 key 不同 body 返回 `409`，并发请求只创建一个项目。
- 新增 `DatabaseExecutor` 类型，让普通 Drizzle 连接和事务连接共用同一 Repository 接口；集成测试串行运行，避免多个测试文件同时清理同一个教学数据库。
- Hono workspace 固定稳定版 Drizzle 0.45 与 TypeScript 5.9；`skipLibCheck` 只跳过 Drizzle 包内未安装的可选数据库声明，项目自身继续使用严格类型检查。

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

## 当前数据库边界

- 当前教学鉴权固定恢复 `userId = 1`，尚未实现用户表、真实 Session 和 owner 外键。
- `owner_id NOT NULL` 只能保证值存在，不能保证对应用户存在；接入 Users 领域后才适合添加外键。
- `findByOwner` 已具备正确查询条件，但当前没有 owner ID 索引；进入索引课程时再用查询计划验证是否需要添加。
- `idempotency_records` 当前没有用户外键，`status` 的合法值和处理超时仍由应用层负责；联合唯一索引只保证同一用户、同一操作、同一 key 不会出现两条记录。

## 下一步

1. 对照 TypeORM 的 Entity、migration 和 Repository，明确两套工具隐藏或显式暴露了什么。
2. 继续学习 Transactional Outbox：让业务资源与待投递事件在同一数据库事务中提交。
3. 再补充 `processing` 记录的超时恢复/过期回收，再进入事务、并发与索引的更完整实验。
