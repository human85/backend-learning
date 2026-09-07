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

## 2026-07-18｜DTO 与运行时输入校验

- 理解 TypeScript 类型和 DTO 只能描述期望结构，必须由 ValidationPipe 在运行时执行校验。
- 增加 `POST /projects` 和 `CreateProjectDto`，使用 `@IsString()` 与 `@IsNotEmpty()` 校验项目名称。
- 配置 `whitelist` 与 `forbidNonWhitelisted`，理解清理额外字段和明确拒绝额外字段的区别。
- 通过真实 HTTP 请求观察合法输入返回 `201`，错误类型、空名称和额外字段返回 `400`。
- e2e 首次运行暴露测试启动未执行 `main.ts`，随后提取共享 `configureApp()`，使生产和测试应用使用同一套全局管道配置。
- 当前接口只回显校验后的输入，没有数据库或持久化；下一课将其重构为独立 ProjectsModule。

## 2026-07-18｜项目领域 Feature Module

- 将项目创建行为从根 AppController 和 AppService 移入 `src/projects/`，按 feature 组织 DTO、Controller、Service 和测试。
- 新增 ProjectsModule，通过 `controllers` 注册 HTTP 入口，通过 `providers` 注册可注入的 ProjectsService。
- AppModule 使用 `imports: [ProjectsModule]` 将整个项目领域纳入应用，外部 `POST /projects` 合同保持不变。
- 理解未导入 ProjectsModule 会导致路由不存在并返回 `404`；未注册 ProjectsService 会导致 NestJS 无法解析 Controller 依赖并在启动阶段失败。
- 当前没有其他模块需要注入 ProjectsService，因此没有提前导出 provider。

## 2026-07-19｜进程内项目状态与列表查询

- 为 Project 增加服务端生成的顺序 ID，并在 ProjectsService 的内存数组中保存创建结果。
- 学习者亲自实现 `GET /projects` Controller 方法，正确使用 `@Get()` 并委托 `ProjectsService.findAll()`。
- `findAll()` 返回数组副本，避免调用者直接增加或删除 Service 内部数组元素。
- Service 单元测试验证初始空列表、创建后保存和顺序 ID；e2e 在同一应用实例中连续创建两个项目并查询列表。
- 理解 Nest Provider 默认单例让同一应用进程内的请求共享状态；e2e 的 `beforeEach` 会创建新应用和新 Service，使不同测试相互隔离。
- 明确内存数组会随应用重启消失，也不能在多个服务实例之间共享，因此不等同于数据库持久化。

## 2026-07-19｜路径参数、Pipe 与资源不存在

- 增加 `GET /projects/:id`，使用 `@Param()` 读取路径参数，并通过 ParseIntPipe 在 Controller 执行前将字符串转换为数字。
- 区分 `abc` 无法转换时的 `400 Bad Request`，以及 `999` 格式有效但资源不存在时的 `404 Not Found`。
- ProjectsService 使用 `Array.find()` 查询项目，不存在时抛出带明确消息的 NotFoundException。
- Service 单元测试覆盖真实查询与不存在分支；e2e 覆盖存在、非数字参数和数字 ID 不存在三条 HTTP 路径。
- 通过删除 ParseIntPipe 的假设审查，理解 Controller 和 Service 单元测试直接传入数字并绕过 HTTP 转换，只有 e2e 能发现路径参数仍是字符串的问题。

## 2026-07-19｜调整为 30 天全栈闭环计划

- 第一轮目标调整为在 2026-08-18 前跑通需求、前端、API、认证授权、PostgreSQL、测试、Docker、部署和日志排错。
- 采用 AI 主导实现、学习者重点负责概念理解、需求拆解、代码审查、故障推理和关键验证的加速方式。
- 第一轮达到“能解释、能审查、能在当前项目使用”后继续推进，不在非关键细节上长期停留。
- 输入校验、数据正确性、认证授权、密钥安全、关键测试和部署验证仍是不可跳过的闭环内容。
- 事务并发、性能优化、Redis、队列、微服务和更深入的生产可靠性进入第二轮深化。

## 2026-07-19｜完成进程内 Projects CRUD

- 增加 UpdateProjectDto 和 `PATCH /projects/:id`，只允许修改名称，不允许客户端覆盖服务端 ID。
- ProjectsService 通过统一的私有索引查找方法复用不存在项目的 `404` 规则，更新时创建新对象并替换数组元素。
- 增加 `DELETE /projects/:id`，成功时由 Controller 使用 `204 No Content`，不存在时返回 `404`。
- 单元测试扩展到 18 项，e2e 扩展到 15 项，完整覆盖创建、列表、单项查询、更新和删除的核心路径；lint 与构建通过。
- 通过删除 `@HttpCode(204)` 的假设审查，理解直接调用方法的单元测试看不到框架响应元数据，e2e 才能发现实际状态码回退为 `200`。
- 进程内 CRUD 学习目标已完成，按照 30 天路线不再扩展临时存储，下一步进入 PostgreSQL。

## 2026-07-19｜确定 NestJS 与 Hono 的数据库工具路线

- 安装并启动本机 PostgreSQL 17.10，在 Mini SaaS API 未运行时通过 `psql` 验证数据库能够独立接受连接。
- 理解 API DTO 校验负责尽早返回清晰错误，数据库约束负责保护所有写入路径的数据正确性。
- 对比 TypeORM 与 Drizzle：TypeORM 与 NestJS 的 Module、Provider 和 Repository 注入结合更紧密；Drizzle 的查询结构更接近 SQL。
- 决定当前 Mini SaaS 使用 NestJS + TypeORM，后续 Hono 对照项目使用 Drizzle，以两个项目比较框架抽象和 SQL 可见性。
- 两条路线都保留 SQL 学习：阅读迁移、观察生成查询，并通过 `psql` 手写关键语句。

## 2026-07-19｜建立 TypeORM 连接与第一份迁移

- 安装 `@nestjs/typeorm`、TypeORM 和 `pg`，通过 ConfigModule 读取未提交的 `DATABASE_URL`，并让 Nest 与迁移 CLI 复用同一个数据库配置函数。
- 新增 ProjectEntity，将 `id` 映射为 PostgreSQL `SERIAL` 主键，将 `name` 映射为 `varchar(100) NOT NULL`；明确序列自增不保证 ID 连续，数据库 `NOT NULL` 也不拒绝空字符串。
- 在 `synchronize: false` 下生成第一份 migration；执行前确认数据库没有业务表，执行后通过 `psql` 查看真实列、默认序列和主键索引。
- TypeORM 创建 `migrations` 表保存迁移履历，重复运行显示没有待执行迁移。
- 应用级数据库连接接入后，18 个单元测试、15 个 e2e、构建和 lint 全部通过；`projects` 表仍为 0 行，因为 ProjectsService 暂时仍使用内存数组。

## 2026-07-19｜将 Projects CRUD 迁移到 Repository

- 学习者正确判断：仅建立 TypeORM 连接不会自动持久化业务数据，ProjectsService 仍使用数组时，API 重启后列表仍为空。
- ProjectsModule 使用 `forFeature([ProjectEntity])` 注册 Repository Provider；ProjectsService 注入 Repository，并将创建、列表、查询、更新和删除改为异步 PostgreSQL 操作。
- Controller 返回 Service 的 Promise，尤其删除接口必须等待异步结果，避免响应先于数据库操作和异常发送。
- Service 单元测试使用 `getRepositoryToken(ProjectEntity)` 注入 mock，删除了不适用于数据库序列的“ID 必须连续”单元测试。
- 新建独立 `mini_saas_test`，e2e 每次测试前重置业务表和序列，避免清理开发数据；新增关闭并重建 Nest 应用后仍能查询项目的持久化测试。
- 17 个单元测试、16 个 e2e、构建和 lint 全部通过，开发库与测试库最终均保持 0 行测试数据。

## 2026-07-19｜对齐 API 校验与数据库约束

- 学习者正确预测 101 字符名称会通过现有 DTO、进入 Controller，最终被 PostgreSQL 拒绝并因未映射的数据库异常返回 `500`。
- 先增加期望 `400` 的 e2e，实际复现 PostgreSQL `22001` 和 HTTP `500`；再为创建、更新 DTO 增加共享的 `MaxLength(100)`，两条测试转为通过。
- 保留数据库 `varchar(100) NOT NULL` 作为绕过 API 时的最终防线，Entity 与两个 DTO 共用 `PROJECT_NAME_MAX_LENGTH`，降低规则漂移风险。
- 通过直接 SQL 确认空字符串能绕过 `NOT NULL`，而 `NULL` 与 101 字符分别被数据库拒绝。
- SQL 实验结束后表中仍为 0 行，但序列值已到 2，证明失败写入和事务回滚可能消耗序列，自增主键不保证连续。
- 完整回归为 17 个单元测试、18 个 e2e、构建和 lint 全部通过；PostgreSQL 第一阶段完成，下一步进入用户、项目归属与认证。

## 2026-07-19｜建立 User 表与唯一约束

- 学习者能够区分身份认证与外键：认证授权决定谁能操作，外键负责保证被引用记录存在并执行删除关系策略。
- 设计 UserEntity，包含服务端生成 ID、唯一且非空的 email、非空 passwordHash 和数据库自动生成的 createdAt；密码哈希列默认不参与 TypeORM 普通查询。
- 生成并审查第二份 migration，确认 `UNIQUE(email)`、`NOT NULL` 和 `DEFAULT now()` 都落实为 PostgreSQL 结构，并在开发库与测试库成功执行。
- 直接 SQL 首次插入用户成功，第二次相同邮箱被唯一约束拒绝；`SELECT *` 仍显示 password_hash，证明 `select: false` 是 ORM 默认查询行为而不是数据库保密边界。
- 清理 SQL 实验数据后，17 个单元测试、18 个 e2e、构建和 lint 全部通过；下一步实现注册、邮箱规范化、密码哈希和安全响应。

## 2026-07-19｜实现安全用户注册

- 学习者正确解释相同密码因随机 salt 产生不同哈希、快速 SHA-256 不适合密码存储、salt 无需保密且哈希不可逆。
- 根据当前安全建议选择 Argon2id，显式使用 19 MiB 内存、2 次迭代、并行度 1；无 MFA 的第一版密码长度设为 15–128，不强制字符组合。
- 新增 UsersModule/UsersService 与 AuthModule/AuthController/AuthService/PasswordService，实践 Module export/import 让 AuthService 跨模块注入 UsersService。
- `POST /auth/register` 校验输入、规范化邮箱、生成哈希并只返回公开字段；重复邮箱的提前检查和数据库 `23505` 都映射为 `409 Conflict`。
- 单元测试分别覆盖 Controller 委托、AuthService 业务、UsersService Repository 和真实 PasswordService；e2e 验证真实数据库只保存 Argon2id 哈希、响应无敏感字段及关键 `400`/`409` 路径。
- 25 个单元测试、23 个 e2e、构建和 lint 全部通过；下一步先实现凭证校验，再选择身份保持方案。

## 2026-07-19｜实现登录凭证校验

- 学习者识别出邮箱不存在返回 `404`、密码错误返回 `401` 会泄漏账号是否存在，并指出登录后仍需要 JWT、Cookie 等持续身份机制。
- 进一步区分 Cookie 是浏览器保存并自动携带数据的载体，Session ID 或 JWT 才是其中承载的身份凭据。
- UsersService 新增登录专用 `findCredentialsByEmail()`，通过 QueryBuilder 显式加载默认 `select: false` 的 passwordHash；普通查询的 Entity 字段仍存在，但值为 `undefined`。
- AuthService 使用共享方法规范化邮箱和映射公开用户；登录通过 Argon2 verify 校验，邮箱不存在和密码错误统一返回 `401 Invalid email or password`。
- AuthController 使用 `@HttpCode(200)` 覆盖 POST 默认 `201`；当前成功响应只证明本次凭证正确，尚未建立后续请求的身份状态。
- 30 个单元测试、25 个 e2e、构建和 lint 全部通过；下一步比较 Session 与 JWT 并选择第一版身份保持方案。

## 2026-07-19｜使用 PostgreSQL Session 保持登录身份

- 学习者正确解释服务端 Session 可立即删除、进程内 Session 会随重启消失，以及无服务端逐令牌状态的 JWT 难以单独撤销。
- 选择 HttpOnly Cookie 携带随机 Session ID、PostgreSQL 保存 userId 的方案；明确 Cookie 是载体，Session 才是服务端身份状态。
- 新增 sessions migration 并在开发库和测试库执行，使用 connect-pg-simple 连接 PostgreSQL，避免 NestJS 明确不建议用于生产的 MemoryStore。
- Cookie 设置 HttpOnly、SameSite=Lax 和 Path=/，生产环境启用 Secure；SESSION_SECRET 只通过环境变量提供，登录成功后 regenerate Session ID 以降低 Session Fixation 风险。
- 首次重启 e2e 返回 `401`，定位到 regenerate 会替换 `request.session`，旧对象引用保存了错误状态；改为在回调中从 Request 重新读取新 Session 后通过。
- 新增 SessionAuthGuard、`GET /auth/me` 和 `POST /auth/logout`；e2e 验证 API 重启后原 Cookie 仍能恢复用户，注销后 Session 行被删除且原 Cookie 返回 `401`。
- 39 个单元测试、27 个 e2e、构建和 lint 全部通过；下一步建立 Project.ownerId 外键和用户数据授权边界。

## 2026-07-19｜理解 Session 签名并建立项目归属授权

- 学习者正确判断 Cookie 被修改后签名验证失败，也能说明多个 API 实例共享 PostgreSQL 和 Session Secret 时可以恢复 userId；明确 Secret 是服务端 HMAC 签名密钥，不存入 sessions 表。
- 学习者正确区分认证和资源归属：Session Guard 会放行已登录用户，但外键不能证明请求者就是 owner，ownerId 必须来自可信 Session 而不是请求体。
- ProjectEntity 与 UserEntity 建立多对一/一对多关系；第四份 migration 增加非空 owner_id 外键和 RESTRICT 删除策略，并在开发库与测试库执行。
- ProjectsController 整体挂载 SessionAuthGuard，所有 CRUD 从 Session 获取 userId；ProjectsService 的 Repository 查询和删除条件均包含 ownerId。
- 双用户 e2e 验证未登录返回 `401`，用户 A 对用户 B 项目的列表、查询、更新和删除都无法越权且单项操作统一返回 `404`。
- 直接 SQL 写入不存在的 owner_id 被 PostgreSQL 外键拒绝；39 个单元测试、30 个 e2e、构建和 lint 全部通过。

## 2026-07-19｜开始前后端凭证联调

- 完成授权链路审查：区分未认证 `401`、已登录但资源不属于当前用户的 `404`、Service ownerId 条件和数据库外键各自保护的边界。
- 学习浏览器 CORS 与后端认证的区别：CORS 由浏览器执行，Postman 和 curl 不受限制，不能代替 SessionAuthGuard。
- 学习者亲手在共享 `configureApp()` 中配置指定的本地前端 origin 和 credentials，避免生产启动与 e2e 配置漂移。
- 发现 `INestApplication.enableCors()` 的 options 参数为 `any`，因此编辑器无法补全或检查属性；将配置对象显式标注为 CorsOptions，恢复类型约束。
- 新增预检 e2e，验证 `Access-Control-Allow-Origin` 与 `Access-Control-Allow-Credentials`；39 个单元测试、31 个 e2e、构建和 lint 全部通过。

## 2026-07-20｜统一 Monorepo 根级格式化工具

- 对比 Ambassador Portal 与 backend-learning，确认前者从仓库根可解析 Prettier，而后者原本只在 `apps/mini-saas` 内安装和配置；根执行实际返回 `Command "prettier" not found`。
- 修正了把保存行为直接归因于 VS Code 设置的假设；项目级工具发现与具体编辑器的保存触发是两个不同问题。
- 将 Prettier 声明为真正的根级工具，新增根 `prettier.config.mjs`、忽略文件和 `format:check`，删除 Mini SaaS 重复配置。
- 参考 Ambassador Portal 增加根级 Husky 与 lint-staged；pre-commit 只处理暂存文件，所有支持的文件先由 Prettier 格式化，Mini SaaS 代码再运行自身 ESLint。
- 根目录已能解析 Prettier 3.9.5，Mini SaaS 文件能定位到根配置；首次全仓格式化只调整排版，实际保存行为仍需学习者在当前编辑环境中确认。

## 2026-07-20｜建立前端 workspace 与统一请求层

- 学习者正确判断 HTTP `401` 会让原生 fetch resolve、CORS 或网络失败会 reject、`204` 响应不能调用 `response.json()`。
- 新增独立 `@backend-learning/mini-saas-web`，采用当前官方 React + TypeScript + Vite 模板；workspace glob 自动发现新应用，根脚本增加 API 与 Web 启动入口。
- 当前 Vite 模板使用 OXLint，因此提交检查保持应用边界：NestJS 使用 ESLint，React 客户端使用 OXLint，不强行统一成一种工具。
- 学习者亲手完成 `apiRequest` 并主动重构为失败分支优先的 early return；函数强制携带 Cookie、保留 RequestInit、处理 204 并把非 2xx 转为 ApiError。
- 将运行时 JSON 先视为 unknown，兼容 NestJS 字符串或数组错误消息并提供未知错误回退；4 个 Vitest、39 个后端单元测试、前后端 lint、build 和全仓格式检查通过。

## 2026-07-20｜建立前端认证 API 合同

- 学习者正确判断注册只创建 User，不创建 Session；注册后直接访问 `/auth/me` 会返回 `401`，登录成功才通过 Set-Cookie 建立持续身份。
- 新增 register、login、getCurrentUser 和 logout 函数，统一复用 `apiRequest`，只表达请求路径、方法、JSON 请求体和返回类型。
- 为 `apiRequest` 增加重载：指定泛型的 JSON 接口返回对应数据，无泛型的 `204` 接口返回 void，避免所有调用方都被无意义的 undefined 联合类型影响。
- 4 个认证合同测试覆盖四条 endpoint，加上请求层测试共 8 项；TypeScript build 还发现并修正测试 mock 对重载签名的错误推断，前后端 lint 与 build 通过。

## 2026-07-20｜用 TanStack Query 跑通浏览器认证闭环

- 学习者正确提出用户状态可以用 `PublicUser | null | undefined` 表达已登录、未登录和检查中，随后进一步指出手写请求状态、大量 CSS 与自建基础组件不符合后端优先的学习目标。
- 将认证页面改为 TanStack Query：`/auth/me` Query 管理加载与错误，登录和注销 Mutation 通过 `setQueryData` 更新当前用户缓存；只有表单输入和登录/注册模式保留为组件本地状态。
- 初始化 Tailwind CSS v4 与 shadcn/ui，使用 Card、Tabs、Field、Input、Button、Alert、Skeleton 和 Spinner 组合最小认证界面，删除手写 `App.css`。
- 处理 TypeScript 6 与旧版 Vite 指南的边界：移除已废弃的 `baseUrl`，只保留 `paths`；OXLint 仅对 CLI 生成的 UI 组件关闭 Fast Refresh 导出警告。
- 真实浏览器验证登录 Mutation、刷新后 `/auth/me` 恢复用户、注销 Mutation 回到未登录界面；移动宽度无横向溢出、控制台无错误，测试用户随后从开发数据库精确清理。
- 前端 3 个测试文件共 10 项通过，OXLint、TypeScript 与 Vite build 通过；下一步用相同方式接入 Projects CRUD。

## 2026-07-20｜集中校验后端运行环境

- 学习者正确预测缺失 `DATABASE_URL` 或 `SESSION_SECRET` 会导致启动失败，也识别出短 Session 密钥和硬编码生产 Origin 的风险；进一步区分了“服务器能启动但浏览器 CORS 联调失败”的部署配置问题。
- 明确 TypeScript 类型在编译时消失，无法保护进程外部提供的环境变量；使用 Joi schema 在 ConfigModule 初始化时执行运行时校验。
- 集中约束 `NODE_ENV`、PostgreSQL URL、至少 32 字符的 Session Secret 和 HTTP(S) 前端 Origin，并通过 `abortEarly: false` 一次报告多项缺失配置。
- CORS 改为读取已验证的 `FRONTEND_ORIGIN`，开发与测试配置示例同步声明完整配置契约。
- 新增 4 个 schema 单元测试；43 个单元测试、31 个 e2e、lint 和 build 通过，真实覆盖短密钥时 AppModule 在监听端口前退出。
- 学习重点明确回到后端闭环；前端只保留为认证、授权和部署行为的最小验证客户端，下一步进入 Dockerfile 与 Compose。

## 2026-07-21｜理解 Docker 基础并构建 API Image

- 从“为什么需要一致运行环境”开始区分 Dockerfile、Image、Container、Compose 和 Volume；学习者能解释容器内 localhost、数据持久化和 Image 重建边界。
- 区分 PostgreSQL 开源数据库软件、本地数据库实例与云托管服务；明确 `POSTGRES_PASSWORD` 用于官方 Image 首次初始化，`DATABASE_URL` 用于 API 每次连接。
- 安装并验证 Docker Desktop 4.83、Engine 29.6 和 Compose 5.3；`hello-world` 成功完成拉取、创建、运行和 `--rm` 清理。
- 新增根级 `.dockerignore` 和 Mini SaaS 多阶段 Dockerfile：构建阶段使用 pnpm workspace 安装与编译，deploy 阶段裁剪生产包，Runtime 阶段以非 root 用户运行 `dist/main.js`。
- 第一次拉取 Node 基础 Image 时一个 layer 经 Shadowrocket 代理暂时停滞；保持代理开启重试后成功，区分网络传输故障与 Dockerfile 代码故障。
- `backend-learning/mini-saas:local` 构建成功；最终 Image 内 Argon2 哈希、NestJS 和 TypeORM 加载通过，没有 TypeScript 源码和测试目录，下一步使用 Compose 接入 PostgreSQL、Volume 和 migration。

## 2026-07-21｜用 Compose 跑通 API、migration 与 PostgreSQL

- 学习者正确判断 API Container 不能用 localhost 连接另一个 Container；进一步修正宿主机可通过 `5433:5432` 端口映射访问容器数据库，以及数据库未 ready 会导致 migration 连接失败而不是重复执行。
- 新增 PostgreSQL、migrate 和 API 三个 Compose Service；PostgreSQL healthcheck 通过后才运行 migration，migration `Exited (0)` 后才启动 API。
- PostgreSQL 17 官方 Image 使用 `POSTGRES_*` 初始化空 Volume；API 和 migration 使用 `postgres:5432` 内部服务名连接，Mac 已有的本地 5432 与容器映射 5433 不冲突。
- Runtime migration 首次暴露 `dotenv/config` 只来自传递依赖的问题，将 dotenv 补为直接生产依赖；编译后的 DataSource 成功创建 migrations、projects、users 和 sessions 四张表并记录 4 条 migration。
- production Image 的 Secure Cookie 在本地 HTTP 下不回传，`/auth/me` 正确返回 `401`；本地 Compose 显式覆盖 `NODE_ENV=development` 后认证恢复，生产部署仍必须使用 production 和 HTTPS。
- 只重建 API Container 后原 Cookie 继续恢复 Session；只重建 PostgreSQL Container 后 migration、用户和 Session 继续存在，验证 PostgreSQL Volume 独立于两个 Container 的生命周期。
- 实验完成后清空 users、projects 和 sessions，保留 4 条 migration；API 和 PostgreSQL 均保持 healthy，下一课进入容器日志故障诊断。

## 2026-07-21｜使用容器日志分层定位数据库故障

- 使用错误密码启动一次性 migration Container，真实观察到客户端退出码 `1`、PostgreSQL `FATAL` 和错误码 `28P01`；临时 Container 使用 `--rm` 删除后，数据库一侧仍保留对应认证失败日志。
- 学习者能根据 `postgres healthy`、`migrate Exited (1)`、`api` 未启动，确定先查看 migration，而不是从未运行的 API 开始排查；也能识别正常 migration 的 `Exited (0)` 不需要保持运行。
- 建立连接故障分层：`ENOTFOUND` 表示服务名或 DNS，`ECONNREFUSED` 表示地址可解析但端口未接受连接，`28P01` 表示请求抵达 PostgreSQL 但认证失败，`42P01` 表示连接成功但 schema 缺表。
- 学习者指出如果客户端记录认证失败但目标 PostgreSQL 没有同一次连接日志，应怀疑 API 实际连接了另一台数据库；下一课进入生产部署模型与上线验证。

## 2026-07-21｜确定个人免费部署路线并修复生产代理 Cookie

- 澄清公司后端仓库不是学习者本人设计的项目，只作为真实工程观察样本；Docker 是可选的本地基础设施和交付方式，仓库存在 Dockerfile 不影响开发者直接在 Mac 使用 `npm run start:dev`。
- 根据个人项目必须免费的要求，选择 Render Free Web Service 运行 NestJS Docker Image、Neon Free PostgreSQL 保存数据；不使用 30 天后过期的 Render Free PostgreSQL，也不采用当前要求信用卡预授权的 Koyeb。
- 学习者正确预测生产登录后 `/auth/me` 仍为 `401` 是 Cookie 没有正确携带；进一步定位到 HTTPS 在平台入口终止后，内部 HTTP 请求需要 NestJS 信任最近一层代理。
- 新增生产代理 e2e，先复现登录响应存在 Session Cookie 但缺少 `Secure`，再在 production 配置中设置 `trust proxy = 1`；目标测试和完整 43 个单元测试、32 个 e2e、前端 10 个测试、lint、build、format 均通过。
- 根 `pnpm test --runInBand` 曾把 Jest 专用参数传给 Vitest 并被拒绝，随后使用无额外参数的根 `pnpm test` 正确验证两个测试工具；下一步创建个人 Neon 数据库并执行 migration。

## 2026-07-21｜创建 Neon PostgreSQL 并执行线上 migration

- 学习者使用独立个人账号创建 Neon Free PostgreSQL；连接地址保存在 Git 已忽略的 `apps/mini-saas/.env.production.local`，没有进入聊天、命令参数、Docker Image 或提交。
- 先验证连接地址结构，再进行只读连接；源码版 `migration:show` 未列出结果后没有盲目执行，改用实际生产 Docker Image 检查编译产物，确认 4 条 migration 均待执行。
- 使用一次性本地 Container 连接远程 Neon，成功执行 CreateProjects、CreateUsers、CreateSessions 与 AddProjectOwner；事务提交后查询确认 public schema 含 migrations、projects、sessions、users，migration 记录数为 4。
- Neon 生成的 `sslmode=require` 在当前 pg 版本仍按严格证书验证处理，但依赖提示未来大版本语义会变化；后续生产配置应显式使用当前依赖支持的严格验证模式，并在升级 pg 时复核。
- 本地 migration Container 已删除，远程数据库表独立持久化；下一步由 Render Free Web Service 从个人 GitHub Dockerfile 构建 API，并注入生产环境变量连接同一个 Neon 数据库。

## 2026-07-21｜将 API Docker Image 部署到 Render 并完成线上验收

- 学习者使用独立个人 Render 账号，从公开的 `human85/backend-learning` main 分支创建 Free Web Service；选择 Docker、仓库根构建上下文和 `apps/mini-saas/Dockerfile`，生产变量保存在平台，健康检查使用 `/health`。
- Render 成功构建提交 `464e87f` 并显示 Live；外部网页读取工具因新域名安全策略拒绝访问后，没有把工具限制误判为服务故障，改用 curl 验证公网 `/health` 返回 `{ status: 'ok' }`、根路由返回 `Hello World!`。
- 用临时账号完成线上 CORS 预检、注册 `201`、登录 `200`、Secure/HttpOnly/SameSite Cookie、`/auth/me`、项目创建与列表、删除、注销，以及注销后原 Cookie 返回 `401`，证明 Render API、Neon 数据库和服务端 Session 链路真实可用。
- 首次清理脚本因 shell 破坏 SQL 参数占位符而事务回滚；随后使用单引号保护 Node 脚本中的 `$1`，精确删除临时用户并确认 users、projects、sessions 均为 0。该故障属于运维脚本转义，不属于 API 或数据库错误。
- Render Free 实例空闲后会休眠并产生约 50 秒以上冷启动，作为个人学习环境接受这一限制；下一步部署静态前端，并用真实浏览器验证不同免费子域之间的 CORS、SameSite Cookie 和刷新恢复。

## 2026-07-21｜为线上前端选择同源 API Rewrite

- 检查发现 React 客户端仍硬编码 `http://localhost:3000`；改为构建时读取 `VITE_API_BASE_URL`，本地缺省值继续指向 localhost，避免增加新的本地环境文件。
- 官方 Public Suffix List 明确包含 `onrender.com`，因此前端与 API 的两个免费子域会被浏览器视为跨站；仅设置 `credentials: include` 不能让 SameSite=Lax Cookie 随跨站 fetch 发送。
- 一度实现 production `SameSite=None; Secure` 并通过目标 e2e，但在提交前审查到第三方 Cookie 兼容性和 CSRF 边界；确认 Render Static Site 支持 Rewrite 到完整公网 URL 后撤回该方案。
- 最终取舍是前端构建使用 `VITE_API_BASE_URL=/api`，静态站点将 `/api/*` Rewrite 到 API 的 `/*`；浏览器只访问前端 Origin，Session Cookie 继续使用 SameSite=Lax。
- 43 个后端单元测试、32 个 e2e、10 个前端测试、前后端 build、lint 和 format 全部通过；生产前端 bundle 不含 localhost API，下一步创建 Render Static Site 并配置 Rewrite。

## 2026-07-24｜用 OpenAPI 建立可测试的 API 契约

- 学习者正确区分 Swagger 元数据与真实 Guard、Pipe 行为：缺少认证标注不会关闭 SessionAuthGuard，错误字段描述也不会改变 ValidationPipe 的 `400`；进一步澄清 Entity 新增字段不会自动进入显式 Response DTO。
- 接入 `@nestjs/swagger`，提供 `/docs` 和 `/openapi.json`；Auth 与 Projects 记录输入 schema、公开响应、关键状态码和 Cookie Session 安全方案。
- 将原 PublicUser type 升级为运行时可反射的 PublicUserDto，并新增 ProjectResponseDto；数据库 Entity 继续表达持久化结构，公开 DTO 只允许客户端可见字段，避免把 `select: false` 错当成序列化安全边界。
- 新增契约 e2e，确保公开用户 schema 不含 `password` 或 `passwordHash`，并校验 Projects 引用正确的 Cookie 安全方案；测试先发现方案注册名与引用名不一致，修正后通过。
- 43 个单元测试、33 个 e2e、构建和 lint 通过；下一步部署文档并进行线上生产清单验收。

## 2026-08-11｜完成线上浏览器 Session 闭环

- 学习者按预期在真实 Render 静态站点完成未登录 `401`、注册 `201`、登录 `200`、刷新后 `/auth/me` `200`、注销 `204` 和再次未登录 `401`。
- 该证据同时覆盖相对 `/api` 地址、Static Site Rewrite、生产 HTTPS、Secure Cookie、Render API、PostgreSQL Session 和注销销毁，而不只是证明页面能够打开。
- 线上 `/health`、`/docs` 和 `/openapi.json` 均为 `200`；公开用户 schema 只含 id、email、createdAt，Projects 正确引用 Cookie 安全方案。
- 学习者正确按层判断三类生产故障：新接口 `404` 优先检查部署版本，缺表错误定位数据库 schema，收到 HTML 而非 JSON 优先检查静态 Rewrite。
- 精确查询确认临时账号没有项目和有效 Session，删除账号后再次查询为 0；下一课用生产检查清单结束第一轮闭环。

## 2026-08-12｜理解生产限流、请求追踪与兼容 migration

- 生产检查从“功能能运行”扩展到成功证明、失败发现、故障定位和恢复方式；学习者能分别指出暴力登录需要限流，零散 `500` 需要优化日志，破坏性数据库变更需要恢复措施。
- 将“优化日志”具体化为结构化日志与 Request ID，并明确日志不能记录密码、完整 Cookie、Session ID 或数据库连接地址。
- 纠正把缺失数据库列理解为 JavaScript `undefined`：旧代码查询已删除或改名的列时，PostgreSQL 会直接报错并通常形成 HTTP `500`。
- 学习者正确判断给已有数据表直接增加无默认值的 `NOT NULL` 列会失败；理解字段改名应采用添加新列、兼容读写、回填、切换新代码、最后删除旧列的扩展—迁移—收缩流程。
- 明确备份是不可重建数据的最后防线，不是每次 schema 变更的首选回滚机制；下一课继续完成生产检查清单。

## 2026-08-12｜完成第一轮生产检查与全栈闭环

- 学习者正确计算每小时备份场景最坏 RPO 为 55 分钟，并能区分 RPO 关注数据损失、RTO 关注恢复耗时；代码缺陷且数据库正常时优先回滚代码，不恢复数据库。
- 区分日志、指标和告警：日志定位单次事件，指标观察整体趋势，告警在阈值异常时通知人员；理解只有日志而无告警可能无法及时发现夜间故障。
- 区分 Liveness 与 Readiness：进程可响应时 Liveness 可为 `200`，数据库不可用时 Readiness 通常为 `503`；普通健康检查无法发现由合法 SQL 引起的逻辑数据删除。
- 完成代码、安全、数据、migration、配置、部署、日志和恢复入口的生产清单复盘，并明确限流、Request ID、结构化日志、指标告警、数据库 Readiness、备份恢复演练、自动 migration、容量和正式回滚演练仍未实现。
- 第一轮九项闭环标准均已有代码、测试或线上证据，于目标日期前 6 天完成；下一阶段进入 Hono + Drizzle 对照项目，Mini SaaS 保留为第二轮可靠性深化载体。

## 2026-08-12｜建立 Hono 的显式请求链路

- 对照 NestJS 识别 Hono 的核心结构：路由 handler 对应 Controller 入口，middleware 承担 Guard/Pipe 类似职责，普通函数与显式参数替代 Provider 和依赖注入容器。
- 学习者正确预测 `鉴权 → 输入校验 → 最终 handler` 的执行结果：未登录且输入无效时先返回 `401`；已登录但输入无效时返回 `400`，最终 handler 不执行；鉴权放在前面还能减少无效工作并避免暴露受保护接口的校验细节。
- 新建 `apps/hono-drizzle/`，用内存 ProjectsRepository、Service、Hono 路由、教学用 Session middleware 和 Zod validator 组成最小纵向切片。
- HTTP 测试通过 `app.request()` 验证健康检查、middleware 短路、校验短路，以及清理后的输入和可信 userId 进入 Service；无需启动真实监听端口。
- 下一步保持路由和 Service 契约不变，只把内存 Repository 替换为 Drizzle + PostgreSQL，并阅读生成的 migration SQL。

## 2026-08-13｜用 Drizzle 替换内存 Repository

- 学习者正确指出 Drizzle schema 只定义表的形状，不会自动创建 PostgreSQL 表；只有生成并执行 migration 才会产生真实 schema 变化。
- 使用稳定版 Drizzle 0.45 定义 Projects schema，Drizzle Kit 生成包含 identity 主键、`varchar(100) NOT NULL` 和 `owner_id integer NOT NULL` 的可读 SQL，并成功执行到独立的 `hono_drizzle` 数据库。
- 将内存实现替换为 SQL-like Drizzle Repository；路由、Service 和 `ProjectsRepository` 接口不变，`index.ts` 改为显式创建数据库连接和 Drizzle 实现，印证持久化边界。
- 默认 4 个 HTTP 测试继续通过；新增数据库集成测试通过完整 Hono pipeline 写入并读回 PostgreSQL，真实 Node Server 的 `POST /projects → GET /projects` 同样通过，临时数据已清空。
- 类型检查暴露 Drizzle 稳定版包含未安装的可选数据库声明；将 workspace 固定为 TypeScript 5.9，并仅通过 `skipLibCheck` 跳过第三方声明内部检查，项目源码仍保持 strict。
- 下一课先逐行阅读生成 SQL 与 Drizzle 查询，再对照 TypeORM 的 Entity、Repository 和依赖注入方式。

## 2026-08-13｜用双用户数据捕获越权查询

- 学习者正确判断 owner 过滤属于真实 Repository 查询行为，应由连接 PostgreSQL 的集成测试覆盖；进一步澄清 Mock 也能伪造多个用户，但不会执行 Drizzle 查询，因此无法发现漏写 `where`。
- 新增用户 1 与用户 2 各有一个项目的场景，以教学鉴权用户 1 请求 `GET /projects`，只允许返回用户 1 的项目。
- 故意移除 Drizzle 的 owner 条件后，测试实际收到两个用户的项目并失败；恢复过滤后重新通过，证明测试能稳定发现横向越权漏洞，而不是只在正确代码上显示绿色。
- 集成测试显式加载本地环境配置，因为它直接导入数据库工厂并绕过会加载 dotenv 的生产入口；测试完成后继续清空项目数据。

## 2026-09-01｜从限流到幂等与异步任务可靠性

- 学习者正确区分 CORS、认证和授权：允许的前端来源仍可能因为缺少 Session 返回 `401`，而 Postman/curl 不受浏览器 CORS 限制；带凭证的跨源请求不能使用 `Access-Control-Allow-Origin: *`。
- 明确登录限流应使用 IP 与账号/邮箱的组合，响应使用 `429`，配合 `Retry-After`、指数退避和最大重试次数；只按单一维度会分别造成绕过或误伤/账号锁定型拒绝服务。
- 理解超时后的重复 `POST` 可能造成重复创建；客户端应在一次逻辑操作的所有重试中复用幂等键，服务端用持久化记录、请求哈希和 `(user_id, operation, idempotency_key)` 联合唯一约束识别重复或错误复用。
- 理解数据库事务只能保证数据库内的原子性，不能撤回已发送的邮件等外部副作用；使用 Transactional Outbox 将资源和待发送事件放在同一事务，Worker 处理成功后确认，并通过幂等消费者承受至少一次投递。
- 区分永久失败与临时失败：临时数据库故障可退避重试，格式错误消息应在有限尝试后进入死信队列；异步资源用 `202` 表示已接受，状态查询成功即使任务失败仍返回 `200`，并按 Session userId 限定任务归属。
- 本节为概念训练，尚未在 Mini SaaS 或 Hono 项目中实现限流、Request ID、Outbox、队列和异步任务；下一步可用小实验把幂等记录与唯一约束落地。

## 2026-09-01｜用联合唯一约束落地幂等 reservation

- 将概念模型落到 Hono + Drizzle：新增 `idempotency_records` 表，保存 `user_id`、服务端定义的 `operation`、客户端幂等键、请求哈希、处理状态和原始响应。
- 生成并审查 migration SQL，确认 PostgreSQL 实际创建 `UNIQUE (user_id, operation, idempotency_key)`；同一个 key 在不同用户或不同操作下可以各自建立记录。
- Repository 使用 `INSERT ... ON CONFLICT DO NOTHING` 取得 reservation，避免“先查询再插入”的竞态；同哈希返回 `replay` 或 `in-progress`，不同哈希返回 `conflict`。
- 真实 PostgreSQL 集成测试覆盖已完成响应重放、同范围错误复用、跨用户/跨操作隔离和并发竞争；Hono 普通测试 4 项、集成测试 6 项、build 和 lint 均通过。
- 本次只实现数据库原语，没有接入 HTTP 创建流程、processing 超时恢复或幂等记录清理；幂等知识仍保持“理解中”，下一步进入 Transactional Outbox。

## 2026-09-02｜把幂等 reservation 接入 HTTP 创建事务

- 为 Drizzle 数据库连接补充普通连接与事务连接的共同类型，让 Projects Repository 和 Idempotency Repository 可以在同一事务对象上复用。
- 新增 `idempotent-projects.service.ts`：先以 `userId + operation + Idempotency-Key` 计算请求范围和 SHA-256 请求哈希，再在一个 PostgreSQL 事务中执行 reservation、创建项目和保存 `201` 原始响应。
- `projects.routes.ts` 保留无 key 的原有行为；带 key 时重放返回原状态码和 JSON，错误复用返回 `409`，处理中状态返回 `409`，空 key 或超过 255 字符返回 `400`。
- 真实 Hono + PostgreSQL 集成测试新增重试、请求内容冲突和并发 HTTP 场景：全部 9 项通过；普通 HTTP 测试 4 项、build 和 lint 也通过。
- 通过代码逐层确认请求链路：`requireDemoSession → zValidator → projects.routes.ts → idempotent-projects.service.ts → transaction → 两个 Drizzle Repository → PostgreSQL`。当前仍未实现 `processing` 超时恢复、记录清理、Outbox 和 Worker；下一课进入 Transactional Outbox。

## 2026-09-02｜把 Transactional Outbox 接到项目创建

- 新增 `outbox_events` 表及 Drizzle Repository，保存 `eventType`、聚合 ID、payload、`pending` 状态、尝试次数和错误信息；生成并执行 `0002_solid_firestar.sql` migration。
- 抽出 `project-creation.service.ts`，普通创建和幂等创建都在同一数据库事务中完成项目写入与 `project.created` Outbox 事件写入；幂等层再保存原始 HTTP 响应。
- 集成测试验证普通创建和幂等创建都会留下一个 `pending` 事件，幂等重试不会重复插入项目或事件；普通测试 4 项、集成测试 9 项、build 和 lint 均通过。
- 明确边界：Outbox 行提交只证明“待发送事件不会因 API 进程崩溃而丢失”，不代表外部邮件/支付已经成功；下一课实现最小 Worker 的领取、成功确认和失败重试。

## 2026-09-07｜优化第二轮指导方案与学习档案

- 本次为学习者授权的指导方案维护，没有新增功能实现、实际课程或能力测评，未提升任何知识点的掌握程度。
- 将第二轮技术清单收敛为 R1 可靠性实验收尾、R2 排错与基础 CI、R3 陌生需求交付、R4 按问题选题；明确阶段载体、参考课程数、工程/学习退出条件和暂缓范围。
- 新增学习方法：先收集预测再反馈，AI 继续主导实现，加入故障验证、迁移与短复测；直接演示记为未测评，工程验证与学习者回答分开记录。
- 当前进度只保留焦点证据、下一课与复测项；截至 2026-09-02 的长知识表迁入 knowledge-history.md，保留原记录，不作为新的能力评级。同步更新 AGENTS、档案入口、第一轮计划衔接、项目说明和 README，消除已完成工作仍列为下一步的过期描述。
- 核对当前 HTTP 幂等代码：reservation、项目、Outbox 与 completed 响应同事务提交；最终回滚不会留下该次已提交的 processing。原语单独提交 reservation、未来 Worker 领取恢复和 completed 清理属于不同边界。修正专题笔记与当前计划，旧日志按追加规则保留。
- 下一课聚焦 Outbox 写入失败的真实事务回滚与恢复后同 key 重试；该故障注入用例尚未实现，Worker 也尚未实现。运行集成测试前必须核实隔离测试库，根 pnpm test 不包含 Hono 数据库集成测试。
- 验证：15 份 Markdown 的 Prettier 与 git diff --check 通过；38 个本地链接目标存在且已跟踪或纳入本次变更；旧学习日志前缀与迁出的 61 条知识记录保持原内容。已核对相关 package scripts 与事务/测试源码；本次未运行业务测试、数据库实验或线上验收。

## 2026-09-07｜用真实故障注入验证 Outbox 事务回滚

- 学习者正确指出 Outbox 的价值在于外部服务成功后无法由数据库回滚，因此事件应绑定业务动作，而不是是否带 `Idempotency-Key`；这一部分理解仍需迁移到 Worker 的确认边界。
- 学习者首次预测普通创建失败后“不留下数据”是正确方向，但将数据库故障对应的响应判断为 `401`；带幂等键时预测会留下数据，尚未说明故障移除后的同 key 重试行为。反馈后明确：已认证请求的数据库异常当前返回 `500`，reservation、项目、Outbox 和 completed 响应在同一事务中，最终回滚不会留下本次记录。
- 在隔离 `hono_drizzle` 数据库中新增集成故障实验：临时 PostgreSQL trigger 在真实 `outbox_events` INSERT 时抛错，没有 mock 整个事务。普通创建和带幂等键创建均验证项目、事件及幂等 reservation 回滚；移除 trigger 后同 key 返回 `201`，只创建一条项目、一条 pending 事件和一条 completed 记录。
- 实验第一次断言恢复后 ID 为 `1`，实际发现 PostgreSQL identity 序列不会因事务回滚倒退；改为验证业务行与事件 aggregate ID 的关系，不把序列连续性当作业务正确性。
- 工程验证：Hono 普通测试 4 项、PostgreSQL 集成测试 11 项、build、lint、Prettier check 和 `git diff --check` 通过；故障注入只作用于本地隔离数据库，测试结束后清理数据和 trigger。学习者对状态码、回滚记录和恢复重试尚未完成独立复述，因此不提升为独立掌握。
- 下一步：先复测“事务已提交但客户端响应丢失”和“外部接收端成功但 Outbox 尚未确认”的区别，再实现单 Worker 的成功确认与有限失败重试。
