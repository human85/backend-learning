# 长期决策记录

## D-001｜项目以学习为首要目标

- 日期：2026-07-18
- 状态：有效
- 决策：本仓库首先服务于后端学习，不以最快完成功能为目标。
- 影响：Agent 应小步教学、解释原因、避免超前抽象和未经请求的大规模实现。

## D-002｜使用 Git 内文档恢复教学上下文

- 日期：2026-07-18
- 状态：有效
- 决策：使用 `docs/learning-progress.md` 保存当前快照，使用 `docs/learning-log.md` 保存不可变的学习过程。
- 影响：新设备上的 Agent 应先读取学习档案，再结合代码与 Git 状态安排下一课。

## D-003｜以 pnpm 管理依赖

- 日期：2026-07-18
- 状态：有效
- 决策：使用 `pnpm` 和已提交的 `pnpm-lock.yaml`，确保不同设备获得一致依赖版本。

## D-004｜由 Agent 提交并同步学习阶段

- 日期：2026-07-18
- 状态：有效
- 决策：一个知识点、练习或文档阶段形成完整且已验证的结果后，Agent 可以直接创建 Git 提交并正常推送当前分支，无需另行询问。
- 影响：提交应小而聚焦，并包含相关代码、测试和学习档案；推送用于保持多设备同步，但该授权不包含改写历史、强制推送或破坏性 Git 操作。

## D-005｜采用后端学习 Monorepo

- 日期：2026-07-18
- 状态：有效
- 决策：仓库定位为 `backend-learning`，使用轻量 pnpm workspace 管理多个独立学习项目；Mini SaaS 位于 `apps/mini-saas/`。
- 原因：未来可能通过不同类型的项目学习实时通信、异步任务等知识，同时保留统一的学习路线和上下文。
- 影响：完整应用放入 `apps/`，最小实验按需放入 `labs/`，只有出现真实跨项目复用后才创建 `packages/`。暂不采用 Nest CLI 专属 monorepo、Nx 或 Turborepo。

## D-006｜采用 AI 主导、判断力优先的练习方式

- 日期：2026-07-18
- 状态：有效
- 决策：日常实现主要由 Agent 完成，学习者优先掌握后端概念、请求链路、架构取舍、代码审查、故障诊断和结果验证；只在亲手实现能显著加强理解时安排少量关键代码练习。
- 原因：长期开发将大量使用 AI 生成代码，学习目标是让学习者具备指导、审查和纠正 AI 的后端基础，而不是通过大量手写样板代码训练熟练度。
- 影响：Agent 不要求学习者重复编写 Controller、配置或测试样板；短练习应目标明确、范围小，并在完成后解释其在整体链路中的位置。

## D-007｜采用 30 天闭环优先、第二轮深化的路线

- 日期：2026-07-19
- 状态：有效
- 决策：第一轮以 2026-08-18 为目标，优先跑通前端、API、认证授权、PostgreSQL、测试、Docker、部署和日志排错；达到当前项目可用的理解程度后继续推进，第二轮再深化复杂后端主题。
- 原因：学习者希望尽快具备借助 AI 承担常规全栈工作的能力，先建立完整地图和交付经验，再补齐深度更符合当前职业目标。
- 影响：第一轮时间盒限制非关键细节，但不得跳过输入校验、数据正确性、认证授权、密钥安全、关键测试和部署验证；Redis、复杂事务并发、性能和分布式系统进入第二轮。

## D-008｜NestJS 使用 TypeORM，Hono 对照项目使用 Drizzle

- 日期：2026-07-19
- 状态：有效
- 决策：Mini SaaS 的 NestJS 阶段使用官方紧密集成的 TypeORM；后续建立 Hono 对照项目时使用更贴近 SQL 的 Drizzle。
- 原因：当前阶段先借助 `@nestjs/typeorm` 理解 Entity、Repository、依赖注入和迁移，减少同时学习多套集成机制的负担；Hono 阶段再通过 Drizzle 观察函数式路由、显式依赖和 SQL-like 查询。
- 影响：两阶段都必须阅读迁移和关键查询对应的 SQL，并使用 `psql` 做少量手写验证；比较重点是框架抽象和数据访问方式，不把选择简化为工具优劣。

## D-009｜使用 Argon2id 保存密码

- 日期：2026-07-19
- 状态：有效
- 决策：Mini SaaS 使用 Argon2id 哈希密码，显式采用 19 MiB 内存、2 次迭代、并行度 1；第一版密码长度为 15–128 字符，不强制大小写、数字或特殊字符组合。
- 原因：密码哈希需要刻意消耗时间和内存以提高离线破解成本；当前项目没有 MFA，因此采用无 MFA 场景的最低长度建议，并保留足够的 passphrase 空间。
- 影响：数据库只保存 PHC 格式哈希，不保存明文密码或独立 salt；登录必须使用 Argon2 verify，响应必须显式排除密码和哈希。

## D-010｜浏览器认证使用服务端 Session

- 日期：2026-07-19
- 状态：有效
- 决策：Mini SaaS 第一版使用 HttpOnly Cookie 携带随机 Session ID，Session 状态保存在 PostgreSQL；不在 localStorage 保存身份凭据，也不使用进程内 MemoryStore。
- 原因：当前应用以浏览器为主要客户端，已经依赖 PostgreSQL；服务端 Session 更容易理解身份状态位置、立即注销和单独撤销，并能在 API 重启或多实例之间继续工作。
- 影响：sessions 表必须通过 migration 管理；登录后重新生成 Session ID，Cookie 显式设置 HttpOnly、SameSite 和生产环境 Secure；后续部署还要配置 HTTPS、可信代理、CSRF 防护和过期策略。

## D-011｜格式化与提交检查由 Monorepo 根项目统一管理

- 日期：2026-07-20
- 状态：有效
- 决策：根项目声明 Prettier、Husky 和 lint-staged，保存统一格式配置并在提交前处理已暂存文件；应用不复制相同的 Prettier 配置。
- 原因：格式化和 Git 提交检查作用于多个 workspace 应用、文档和根配置。只在嵌套应用安装会让仓库根无法解析工具，也不利于编辑环境稳定发现。
- 影响：根 `pnpm format` 执行写入格式化，`pnpm format:check` 只检查；pre-commit 先运行 Prettier，再让 Mini SaaS 代码进入应用自己的 ESLint。Mini SaaS 继续独立管理 NestJS、TypeORM、ESLint 等应用级依赖和规则。

## D-012｜Mini SaaS 前端使用 React + Vite 薄客户端

- 日期：2026-07-20
- 状态：有效
- 决策：浏览器客户端作为独立 workspace 放在 `apps/mini-saas-web/`，使用 React、TypeScript 和 Vite；第一阶段通过原生 fetch 封装直接调用 NestJS API。
- 原因：学习者已经具备前端经验，当前目标是清晰观察浏览器 → CORS → Cookie → Session → API 链路，暂不引入 Next.js 服务端层或额外 HTTP 库。
- 影响：前端默认端口 5173；统一 `apiRequest` 强制携带 credentials，并负责 HTTP 错误与 204 响应。页面视觉设计在认证和 Projects 完整联调后再按实际需要处理。

## D-013｜前端优先复用成熟的状态、样式与组件方案

- 日期：2026-07-20
- 状态：有效
- 决策：Mini SaaS 前端使用 TanStack Query 管理服务端状态，使用 Tailwind CSS 和 shadcn/ui 组织界面；不在业务组件中重复手写请求生命周期、基础组件或大体量 CSS。
- 原因：学习重点是后端闭环，学习者已经具备前端经验；成熟工具能减少非核心实现时间，同时让缓存更新、错误状态和 UI 组合更接近真实工作项目。
- 影响：`apiRequest` 继续负责传输边界，feature API 负责 endpoint 合同，Query/Mutation 负责缓存和异步状态，React 本地状态只保存纯界面数据。新增界面优先检索并组合已有 shadcn 组件，样式以 Tailwind 布局类和语义主题变量为主。

## D-014｜运行环境采用集中校验并快速失败

- 日期：2026-07-20
- 状态：有效
- 决策：Mini SaaS 使用 ConfigModule 加 Joi schema 集中校验运行环境；数据库地址、Session 密钥和前端 Origin 不再由各个使用点零散判断或硬编码。
- 原因：环境变量是进程外部输入，TypeScript 无法提供运行时保证；错误配置应在应用监听端口前暴露，而不是等到首个请求或数据库操作才失败。
- 影响：新增运行配置时必须同步 schema 和 `.env.example`；密钥只校验必要的结构条件，真实值继续由未提交的本地文件或部署平台管理；Docker 和生产部署必须显式提供全部必需变量。

## D-015｜API 使用多阶段生产 Image

- 日期：2026-07-21
- 状态：有效
- 决策：Mini SaaS API 使用 Node.js slim 多阶段 Dockerfile；pnpm 在构建阶段安装 workspace 依赖、编译并生成独立生产目录，最终 Runtime Image 只保留编译结果和生产依赖，并使用非 root 用户运行。
- 原因：构建工具和源码不属于生产运行边界；分离阶段可以降低最终 Image 体积与攻击面，同时保持 pnpm lockfile 和 monorepo 构建可重复。
- 影响：Docker build context 必须是仓库根目录；`.dockerignore` 不允许真实 `.env`、本机依赖或构建产物进入上下文；Image 必须经过真实构建和运行时依赖加载验证后才能提交。

## D-016｜Compose 使用独立 migration Service 和 PostgreSQL Volume

- 日期：2026-07-21
- 状态：有效
- 决策：本地 Compose 将 PostgreSQL、migration 和 API 分为三个 Service；migration 等待数据库 healthy 并成功退出后，API 才能启动。PostgreSQL 17 数据挂载到具名 Volume。
- 原因：Container 启动不等于数据库 ready，API 实例也不应各自并发修改 schema；持久化数据的生命周期必须独立于 PostgreSQL Container。
- 影响：API 和 migration 使用 `postgres:5432` 内部地址；Mac 通过 5433 访问容器数据库以避开本地 5432；`synchronize` 保持 false；本地 HTTP 覆盖为 development，生产环境必须使用 production、HTTPS 和外部密钥。

## D-017｜首次个人部署使用免费 Render Web 与 Neon PostgreSQL

- 日期：2026-07-21
- 状态：有效
- 决策：个人学习项目使用独立个人账号；Render Free Web Service 从 GitHub Dockerfile 构建并运行 API，Neon Free PostgreSQL 保存业务数据和 Session。公司仓库与公司平台只作为只读案例，不复用公司账号或资源。
- 原因：第一轮需要真实完成 HTTPS、环境变量、migration、日志和持久化闭环，同时避免个人学习产生固定成本或意外费用。Render 自带 HTTPS 和 Docker 构建，Neon 免费数据库不会像 Render Free PostgreSQL 一样在 30 天后到期。
- 影响：接受免费 Web Service 的休眠和冷启动，不把它当作正式生产 SLA；生产变量只保存在平台，仓库不提交真实密钥；迁移、健康检查、认证授权和数据持久化必须在线上实际验证。免费计划条款可能变化，创建资源前应再次核对官方价格与限制。

## D-018｜免费 Render 子域通过静态站点 Rewrite 保持同源 Session

- 日期：2026-07-21
- 状态：有效
- 决策：React 静态站点使用相对基地址 `/api`，Render Static Site 将 `/api/*` Rewrite 到 API Service 的 `/*`；生产 Session Cookie 继续使用 `SameSite=Lax; Secure`，不为两个 onrender.com 子域改成 SameSite=None。
- 原因：onrender.com 位于 Public Suffix List，两个免费子域是不同 Site；跨站 Cookie 既依赖第三方 Cookie 策略，也扩大 CSRF 边界。平台 Rewrite 能让浏览器始终访问前端 Origin，同时保留独立 API Service。
- 影响：静态站点必须保存 API Rewrite 规则，且 API 的 FRONTEND_ORIGIN 必须匹配静态站点 URL；前端构建通过 `VITE_API_BASE_URL=/api` 注入非秘密配置。本地开发缺省仍访问 `http://localhost:3000`，继续使用 CORS 和 SameSite=Lax。

## D-019｜公开 API 使用独立 Response DTO 和可测试 OpenAPI

- 日期：2026-07-24
- 状态：有效
- 决策：数据库 Entity 不直接作为公开用户合同；Auth 和 Projects 使用显式 Response DTO，并通过 `@nestjs/swagger` 生成 OpenAPI。关键敏感字段和认证方案进入契约 e2e。
- 原因：TypeORM 的 `select: false` 不是序列化安全保证，Entity 字段也会随持久化需求变化；显式 DTO 能固定客户端边界，OpenAPI 则为前端、测试和 AI 提供机器可读合同。
- 影响：新增或修改公开接口时同步更新 DTO、Swagger 元数据和相关契约测试；OpenAPI 描述不能代替 ValidationPipe、Guard、Service 测试或真实业务 e2e。
