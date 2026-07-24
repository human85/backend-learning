# Mini SaaS 学习项目

## 项目定位

Mini SaaS 是本仓库的第一个完整后端应用，也是 30 天第一轮全栈闭环的主项目。它用连续业务场景学习 NestJS、HTTP、PostgreSQL、认证授权、测试、Docker 和部署；Redis 等深化内容放到闭环完成后。它不是“每个概念一个 demo”，而是用于观察知识如何在长期项目中组合。

## 当前状态

- 路径：API 位于 `apps/mini-saas/`，浏览器客户端位于 `apps/mini-saas-web/`
- 技术栈：Node.js、TypeScript、NestJS 11、TypeORM、PostgreSQL 17、React 19、Vite 8、TanStack Query、Tailwind CSS、shadcn/ui、Jest、Vitest
- 阶段：NestJS、PostgreSQL、认证授权、Docker 和首次部署完成，进入闭环验收
- 30 天里程碑：第 1 至第 3 周已完成，第 4 周进行中
- 已有行为：`GET /` 返回 `Hello World!`；`GET /health` 返回 `{ "status": "ok" }`；认证支持注册、登录、当前用户和注销；已登录用户只能 CRUD 自己的项目
- 数据库与认证：注册和登录使用 Argon2id；PostgreSQL 保存服务端 Session；Project.ownerId 非空外键指向 User，所有查询按当前用户隔离

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
- 新增 UsersModule 与无公开路由的 UsersService，向 AuthModule 导出用户查询和保存能力；AuthController 提供 `POST /auth/register`。
- AuthService 将邮箱规范化为小写，使用 PasswordService 生成 Argon2id 哈希，并把提前发现的重复邮箱和数据库 `23505` 都映射为 `409 Conflict`。
- 注册 DTO 只接受合法邮箱和 15–128 字符密码，拒绝客户端提交 passwordHash；成功响应显式只含 id、email、createdAt。
- 单元测试扩展到 25 项，e2e 扩展到 23 项；真实数据库验证哈希不是明文、Argon2 verify 成功且响应不含敏感字段，构建和 lint 通过。
- 新增登录专用的 `findCredentialsByEmail()`，只在凭证校验路径通过 `addSelect` 显式读取默认隐藏的 passwordHash，普通用户查询仍不加载其值。
- `POST /auth/login` 规范化邮箱并使用 Argon2 verify；邮箱不存在与密码错误都返回相同的 `401 Invalid email or password`，避免通过响应枚举账号。
- 登录明确返回 `200` 而不是 NestJS POST 默认的 `201`；成功响应继续只含公开用户字段，但尚未签发 Session 或 JWT。
- 单元测试扩展到 30 项，e2e 扩展到 25 项；构建、lint、真实正确密码及两种统一失败路径全部通过。
- 新增第三份 migration 创建 sessions 表和过期时间索引；开发库与测试库都执行成功，运行时 store 不负责偷偷建表。
- 使用 connect-pg-simple 保存 Session；Cookie 显式设置 HttpOnly、SameSite=Lax、Path=/，生产环境启用 Secure，Session Secret 通过环境变量读取。
- 登录成功后重新生成 Session ID，再把 userId 保存到新 Session；修复并记录 regenerate 会替换 `request.session` 对象引用的真实测试问题。
- 新增 SessionAuthGuard、`GET /auth/me` 和 `POST /auth/logout`；未登录访问返回 `401`，注销销毁数据库记录并清理 Cookie。
- 39 个单元测试、27 个 e2e、构建和 lint 全部通过；e2e 关闭并重建 Nest 应用后使用原 Cookie 仍能恢复用户，证明状态不依赖进程内存。
- ProjectEntity 与 UserEntity 建立多对一/一对多关系，第四份 migration 新增非空 owner_id 外键并采用 `ON DELETE RESTRICT`；开发库和测试库均执行成功。
- ProjectsController 整体使用 SessionAuthGuard，创建时从 Session 读取 userId；CreateProjectDto 不开放 ownerId，客户端伪造归属返回 `400`。
- ProjectsService 的列表、单项、更新和删除都把 ownerId 放进 Repository 条件；访问不存在或属于其他用户的项目统一返回 `404`。
- 双用户 e2e 验证用户 A 无法列出、读取、修改或删除用户 B 的项目；直接 SQL 写入不存在 owner 被 PostgreSQL 外键拒绝。
- 39 个单元测试、30 个 e2e、构建和 lint 全部通过，随后完成授权代码审查。
- 学习者亲手在共享 `configureApp()` 中配置 CORS，只允许本地前端来源并支持凭证请求；显式使用 CorsOptions 弥补 NestJS 通用应用接口的 `any` 参数边界。
- 新增 OPTIONS 预检 e2e，验证允许来源和凭证响应头；39 个单元测试、31 个 e2e、构建和 lint 全部通过。
- 新增独立的 `@backend-learning/mini-saas-web` workspace，使用 React + TypeScript + Vite，默认 5173 端口与 API CORS 配置一致。
- 学习者亲手实现统一 `apiRequest`：强制 `credentials: 'include'`、区分 HTTP 与网络失败、跳过 `204` JSON 解析并抛出带状态码的 ApiError。
- 使用 Vitest mock fetch，验证请求选项和 Cookie 凭证、成功 JSON、204 空响应、HTTP 错误消息与未知错误回退；4 个前端测试、39 个后端单元测试、前后端 lint 和 build 全部通过。
- 前端按 auth feature 新增 register、login、getCurrentUser 和 logout 函数；API 泛型重载区分 JSON 响应与 `void` 响应，4 个合同测试验证路径、方法和请求体。
- 前端测试累计 8 项，前后端 lint 与 build 通过；认证 API 模块只表达 HTTP 合同，不提前保存 React 用户状态。
- 学习者指出前端不应手写重复的异步请求状态和大量 CSS；引入 TanStack Query、Tailwind CSS 与 shadcn/ui，使前端保持服务于后端闭环的薄客户端定位。
- `/auth/me` 的 `401` 在 Query 边界转换为未登录数据，其他失败保留为错误；登录和注销 Mutation 直接更新 `['auth', 'current-user']` 缓存。
- 真实浏览器验证登录、刷新后从 PostgreSQL Session 恢复用户、注销后回到登录页；桌面与移动宽度无横向溢出、控制台无错误，前端测试增至 10 项。
- 使用 Joi 在 ConfigModule 加载时集中校验 `NODE_ENV`、`DATABASE_URL`、`SESSION_SECRET` 和 `FRONTEND_ORIGIN`；缺失、格式错误或短密钥会在应用监听端口前直接失败。
- CORS 不再硬编码本地地址，而是读取已验证的 `FRONTEND_ORIGIN`；环境 schema 单元测试、真实短密钥失败实验、43 个单元测试、31 个 e2e、lint 和 build 均通过。
- 安装并验证 Docker Desktop、Engine 与 Compose，`hello-world` 完成 Image 拉取、Container 创建和运行；区分关闭窗口与退出 Engine 对容器的影响。
- 新增基于 Node 22 slim 的多阶段 API Dockerfile；构建阶段安装完整依赖并编译，pnpm deploy 生成生产目录，Runtime 阶段只复制 `dist` 和生产依赖并以非 root 的 `node` 用户启动。
- 成功构建 `backend-learning/mini-saas:local`，在最终 Image 内实际执行 Argon2 哈希并加载 NestJS、TypeORM；确认没有源码与测试目录，最终大小约 325 MB。
- 新增 Compose 三服务：PostgreSQL 使用官方 17 Image 和具名 Volume，migration 等待数据库健康并一次性执行，API 等待 migration 成功后启动；Mac 通过 3000 访问 API，通过 5433 访问容器数据库。
- 修复 `data-source.ts` 直接使用但未声明 `dotenv` 的生产依赖问题；编译后的 TypeORM DataSource 在 Runtime Image 中成功执行全部 4 条 migration。
- 发现 production 的 Secure Cookie 无法通过本地 HTTP 回传，本地 Compose 显式覆盖为 development；生产 Image 默认仍为 production，后续部署必须提供 HTTPS。
- 重建 API Container 后原 Cookie 恢复 Session；重建 PostgreSQL Container 后 4 条 migration、用户和 Session 继续存在，证明状态由 Volume 和数据库承载。实验业务数据随后清理，schema 与 migration 记录保留。
- 使用错误数据库密码运行一次性 migration，观察客户端退出码 `1` 和 PostgreSQL `28P01` 认证日志；学习者能按 DNS、端口、认证和 schema 分层判断 ENOTFOUND、ECONNREFUSED、密码失败与表不存在，并正确识别 migration 的 `Exited (0)` 是正常完成。
- 增加生产 HTTPS 代理 e2e：先复现登录响应缺少 `Secure` Cookie，再让生产应用只信任最近一层反向代理；带 `X-Forwarded-Proto: https` 的登录响应现已正确设置 Secure Session Cookie，完整 43 个单元测试、32 个 e2e、前端 10 个测试、lint 和 build 通过。
- 创建个人 Neon Free PostgreSQL，连接地址只保存在 Git 忽略的 `.env.production.local`；使用生产 Docker Image 查询到 4 条待执行 migration，成功在线创建 migrations、projects、sessions、users，并再次确认 4 条 migration 全部完成。
- Render Free Web Service 从个人 GitHub `main` 的 Dockerfile 成功构建并上线；公网验证 `/health`、根路由、CORS 预检、注册登录、生产 Secure Cookie、`/auth/me`、项目创建/列表/删除、注销后 `401` 全部符合合同，临时用户、项目和 Session 已从 Neon 精确清理。
- 前端 API 基地址从硬编码 localhost 改为构建时 `VITE_API_BASE_URL`，本地未配置仍使用 localhost；确认 onrender.com 属于 Public Suffix 后，不采用跨站 `SameSite=None`，计划让静态站点将 `/api/*` Rewrite 到 Render API，浏览器保持同源且 Cookie 继续使用 Lax。
- React 静态站点已部署到 Render，并按官方 shadcn 登录 Block 重组认证页；页面通过相对 `/api` 地址访问后端，完整线上 Session 行为仍需在闭环验收中记录。
- 接入 `@nestjs/swagger`，提供 `/docs` 与 `/openapi.json`；Auth 和 Projects 描述请求、响应、关键状态码及 Cookie Session，PublicUserDto 和 ProjectResponseDto 将公开合同与数据库 Entity 分离。
- 新增 OpenAPI e2e，验证公开用户 schema 不含密码字段、Cookie 安全方案存在且 Projects 正确引用；测试首次发现安全方案名称不一致并修复。43 个单元测试、33 个 e2e、构建和 lint 通过。

## 下一项应用课程

完成生产闭环验收：

1. 部署本次 OpenAPI 变更，在线检查 `/docs` 与 `/openapi.json`。
2. 用真实浏览器验证注册、登录、刷新、注销和重新部署后的 Neon Session 恢复。
3. 完成代码、安全、数据、环境、日志与回滚清单，再决定进入 Hono 对照项目或第二轮深化。

完成标准仍以 `docs/learning-progress.md` 的当前快照为准。
