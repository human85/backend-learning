# Hono + Drizzle 对照与可靠性实验

## 项目定位

这个项目用与 Mini SaaS 相同的后端问题，对照观察 Hono 与 NestJS、Drizzle 与 TypeORM 的抽象差异。最小 Projects 对照切片已经完成；现在承载第二轮 R1 的幂等与 Outbox 可靠性实验。R1 达标后暂停扩展，返回 Mini SaaS，不复制完整认证、浏览器和部署架构。

## 当前状态

- 路径：`apps/hono-drizzle/`
- 技术栈：Node.js、TypeScript、Hono、Zod、Drizzle ORM、Drizzle Kit、node-postgres、Vitest
- 阶段：最小 Drizzle + PostgreSQL 纵向切片已完成；幂等、Outbox 失败回滚、单 Worker 基础处理及重复投递去重已验证，R1 资源归属学习复测待完成
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
- 在替换内存持久化的那一步，`projects.routes.ts`、`projects.service.ts` 和 `ProjectsRepository` 接口保持不变，只替换 Repository 实现并在 `index.ts` 选择它；随后加入幂等与 Outbox 时，路由和依赖组装已相应扩展。
- 数据库集成测试通过完整 HTTP pipeline 创建并读回项目，随后清空测试数据；真实 Node Server 也完成相同的 `POST → GET` 验证。
- 资源归属集成测试同时写入用户 1 与用户 2 的项目，再以用户 1 身份查询；故意删除 `where owner_id = 1` 时测试如期失败，恢复后通过，证明测试能捕获越权回归。
- 增加 `idempotency_records` 表和 Drizzle Repository：以 `(user_id, operation, idempotency_key)` 联合唯一索引保留一次逻辑请求，保存请求哈希、处理状态和原始响应；集成测试验证重放、错误复用、跨用户/跨操作隔离和并发 reservation。
- 将幂等能力接入 `POST /projects`：认证和 Zod 校验通过后，带 `Idempotency-Key` 的请求在同一数据库事务中完成 reservation、项目插入和响应保存；重试返回保存的原始响应，同 key 不同 body 返回 `409`，并发请求只创建一个项目。
- 新增 `DatabaseExecutor` 类型，让普通 Drizzle 连接和事务连接共用同一 Repository 接口；集成测试串行运行，避免多个测试文件同时清理同一个教学数据库。
- 新增 `outbox_events` 表和 Repository；普通创建与幂等创建都通过项目创建 Service，在同一个事务中写入 `project.created` 的 `pending` 事件。当前只证明可靠落库，尚未实现事件 Worker。
- 在隔离集成数据库中用临时 PostgreSQL trigger 让 Outbox 插入失败；真实集成测试证明普通创建不会留下项目或事件，幂等创建不会留下项目、事件或 reservation。移除故障后复用同一幂等键可成功创建一次；identity 序列不因回滚倒退，因此测试只验证业务结果，不要求 ID 连续。
- 新增单 Worker：按 `available_at` 和 ID 顺序读取 pending 事件，成功后标记 `processed`；接收端失败时增加 `attempts`、保存错误并重新安排 pending，达到 3 次后保留 `failed` 记录。集成测试验证重启新 Worker 后仍能继续处理 pending 事件。
- 新增重复投递集成实验：真实数据库阻断 `processed` 确认，使外部模拟接收端成功后事件仍为 pending；重启后同一 `outbox_events.id` 再次投递，调用两次但去重后的模拟副作用只有一次，最终事件标记为 `processed`。
- Hono workspace 固定 Drizzle 0.45 与 TypeScript 5.9；`skipLibCheck` 跳过声明文件类型检查，用于当时 Drizzle 可选数据库声明的兼容问题，项目源码继续使用严格类型检查。

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
- `idempotency_records` 当前没有用户外键或 status CHECK 约束；联合唯一索引保证同一用户、同一操作、同一 key 不会出现两条记录，状态转换由应用层控制。
- HTTP 创建将 reservation、项目、Outbox 和 completed 响应放在同一事务；该事务最终回滚时不会留下本次已提交的 processing。Repository 原语单独提交 reservation 时可能留下 processing，不能据此认定 HTTP 创建也需要同样的超时接管。
- completed 记录的保留期限与清理尚未设计；清理会改变迟到重试的语义，应独立决定重试窗口，不能与 processing 恢复混为一谈。
- `outbox_events` 保存事件类型、聚合 ID、JSON 文本 payload、处理状态、尝试次数和错误信息；当前没有消费者、锁领取、重试退避或死信队列。

## 实现与验证注意点

- 当前 HTTP 创建使用事务编排；底层 `ProjectsService.create` 仍可直接插入项目。未来修改创建流程时审查是否需要收敛业务入口，避免绕过事件规则；这是待审查的维护点，不是已确认的 HTTP 缺陷，也未在本次重构。
- 现有集成用例包含成功落库、owner 过滤、重放、内容冲突、并发、Outbox 写入失败后的整体回滚和恢复重试，以及 Worker 成功、重试、失败上限、重启继续处理和重复投递去重；当前共 15 项数据库集成测试通过。当前 Worker 没有领取锁，只适用于单 Worker 教学实验，不代表多实例安全或恰好一次投递。
- 集成测试会清空共享教学数据库，因此 `test:integration` 脚本显式使用 `--no-file-parallelism`；仅依赖 Vitest 配置中的并行选项曾出现跨文件清理竞态，已通过一次故障复现确认并修正。
- `pnpm test` 不执行这里的数据库集成测试；使用 `pnpm --filter @backend-learning/hono-drizzle test:integration`。
- 当前集成测试加载 `DATABASE_URL`，会清空 projects、idempotency_records、outbox_events。运行前必须确认是可清理的隔离测试库；不能因 `.env` 已存在就直接运行。

## 后续安排

下一课完成 R1 资源归属学习复测后再回到 Mini SaaS R2，范围、退出条件及暂缓内容见 [学习进度](../learning-progress.md) 和 [路线图](../roadmap.md)。当前固定教学身份和单库实验不构成生产认证或生产可靠性承诺。
