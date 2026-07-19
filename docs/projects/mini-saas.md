# Mini SaaS 学习项目

## 项目定位

Mini SaaS 是本仓库的第一个完整后端应用，也是 30 天第一轮全栈闭环的主项目。它用连续业务场景学习 NestJS、HTTP、PostgreSQL、认证授权、测试、Docker 和部署；Redis 等深化内容放到闭环完成后。它不是“每个概念一个 demo”，而是用于观察知识如何在长期项目中组合。

## 当前状态

- 路径：`apps/mini-saas/`
- 技术栈：Node.js、TypeScript、NestJS 11、TypeORM、PostgreSQL 17、Jest
- 阶段：NestJS 与 HTTP 基础完成，开始 PostgreSQL 持久化
- 30 天里程碑：第 1 周，进程内 CRUD 已完成，进入 PostgreSQL
- 已有行为：`GET /` 返回 `Hello World!`；`GET /health` 返回 `{ "status": "ok" }`；项目接口支持进程内创建、列表、按 ID 查询、更新和删除
- 数据库：Projects CRUD 已持久化；users 表、邮箱唯一约束和创建时间默认值已通过第二份 migration 加入开发库与测试库；认证、Redis 尚未接入

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
- 增加 `PATCH /projects/:id`，UpdateProjectDto 只开放名称，Service 创建新对象替换原数组元素。
- 增加 `DELETE /projects/:id`，删除成功返回无响应体的 `204`，不存在时继续返回 `404`。
- 单元测试与 e2e 覆盖进程内 CRUD 成功和关键失败路径。
- 使用 `@nestjs/typeorm`、TypeORM 和 `pg` 建立 PostgreSQL 连接，并通过忽略的 `.env` 与已提交的 `.env.example` 分离本机配置和配置契约。
- 将 `synchronize` 保持为 `false`，从 ProjectEntity 生成并执行第一份建表 migration；数据库中的 `migrations` 表记录了执行历史。
- 验证重复执行 migration 不会再次建表；18 个单元测试、15 个 e2e、构建和 lint 在数据库连接接入后继续通过。
- 在 ProjectsModule 中用 `forFeature([ProjectEntity])` 注册 Repository，将 Service 的同步数组 CRUD 改为异步数据库 CRUD，并保持 HTTP 路径、状态码和响应结构不变。
- 使用 mock Repository 保持 Service 单元测试隔离；新增独立 `mini_saas_test` 数据库，每个 e2e 前执行 `TRUNCATE ... RESTART IDENTITY`。
- 新增 API 重启持久化 e2e：创建项目后关闭并重建 Nest 应用，仍能从 PostgreSQL 查询到原记录；17 个单元测试和 16 个 e2e 全部通过。
- 将项目名称最大长度提取为共享领域常量，CreateProjectDto、UpdateProjectDto 与 ProjectEntity 统一使用 100；超长创建和更新均在 Controller 前返回 `400`。
- 先用失败 e2e 复现超长名称进入数据库后产生 `500`，再通过 DTO 修复；直接 SQL 验证数据库允许空字符串、拒绝 `NULL` 和超长值。
- 观察到失败插入和回滚事务会消耗 PostgreSQL 序列值，确认 `SERIAL` 自动生成 ID 但不保证连续。
- 新增 UserEntity：邮箱 `varchar(254) NOT NULL UNIQUE`、密码哈希 `varchar(255) NOT NULL`、数据库自动生成的 `created_at`。
- 在开发库和测试库执行第二份 migration；直接 SQL 验证重复邮箱被唯一约束拒绝，同时确认 `select: false` 不会阻止数据库查询返回 `password_hash`。
- 新增用户表后，17 个单元测试、18 个 e2e、构建和 lint 继续通过。

## 下一项应用课程

将项目数据迁移到 PostgreSQL：

1. 实现注册 DTO、邮箱规范化与密码哈希。
2. 只返回 User 的公开字段，并将重复邮箱映射为 `409`。
3. 实现登录和身份认证。
4. 建立 User 与 Project 的一对多关系及 `ownerId` 外键，让用户只能操作自己的项目。

完成标准仍以 `docs/learning-progress.md` 的当前快照为准。
