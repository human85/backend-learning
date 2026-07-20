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
