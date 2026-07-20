# 当前学习进度

> 这是新 Agent 恢复教学上下文时首先读取的状态快照。

## 基本信息

- 最近更新：2026-07-20
- 学习者背景：Web 前端工程师
- 学习目标：通过真实 Mini SaaS 项目系统学习后端，逐步具备全栈开发能力
- 第一轮目标：在 2026-08-18 前借助 AI 跑通一个可部署的前端 → API → 认证授权 → PostgreSQL → 测试 → Docker → 部署闭环
- 教学偏好：中文讲解；先讲原因再讲术语；使用前端概念类比；AI 主导大部分实现；重点练习需求拆解、代码审查、故障推理和验证；只安排有助于理解记忆的少量手写代码；区分“能运行”和“工程化”；前端只用于验证全栈链路，不重复讲解学习者已经掌握的前端实现

## 当前阶段

- 阶段：前后端联调与本地工程化
- 状态：进行中
- 30 天计划：第 1、2 周已完成，开始第 3 周
- 当前焦点项目：`apps/mini-saas/` 与 `apps/mini-saas-web/`
- 实践进度：API 的认证授权与浏览器认证闭环已完成；后端已集中校验数据库、Session 密钥、运行环境和前端 Origin，错误配置会在启动前失败；下一步进入 Dockerfile 与 Compose

## 已接触的知识

| 知识点                               | 程度   | 证据或说明                                                                                                                   |
| ------------------------------------ | ------ | ---------------------------------------------------------------------------------------------------------------------------- |
| 后端请求链路                         | 理解中 | 已了解 Controller → Service → Repository/ORM → Database                                                                      |
| 前后端职责边界                       | 理解中 | 已理解前端负责体验、后端负责规则和校验                                                                                       |
| Controller、Service、Repository 分工 | 理解中 | 已通过“创建项目”示例串联，但尚未编码                                                                                         |
| Repository 名称与作用                | 理解中 | 已理解它抽象某类数据的存取入口                                                                                               |
| Monorepo 与 pnpm Workspace           | 理解中 | 已能解释两者区别、依赖归属和根级命令与 `--filter` 的范围                                                                     |
| Monorepo 工具归属                    | 接触过 | 对比前端仓库后识别根级工具与应用依赖的区别；Prettier 已提升到根项目，实际保存行为待编辑环境确认                              |
| NestJS 启动与请求阶段                | 理解中 | 已能区分 `main.ts` 启动应用与 Controller、Service 处理请求                                                                   |
| 依赖注入                             | 理解中 | 已理解 Controller 不负责创建 Service，并观察了 `useValue` 测试替换                                                           |
| 单元测试与 e2e                       | 理解中 | 已能根据 mock 和真实应用的执行边界判断测试结果                                                                               |
| DTO 与运行时校验                     | 理解中 | 已能区分 TypeScript 类型描述与 ValidationPipe 的实际校验职责                                                                 |
| 白名单输入                           | 理解中 | 已理解 `whitelist` 清理字段、`forbidNonWhitelisted` 拒绝额外字段                                                             |
| NestJS feature module                | 理解中 | 已理解 `imports`、`controllers`、`providers` 的注册关系和缺失时的故障表现                                                    |
| Provider 实例状态                    | 理解中 | 已能解释同一应用内请求共享 Service 状态，而 e2e 的新应用实例会重置数组                                                       |
| 内存数据与持久化                     | 理解中 | 已理解进程重启、重新实例化或多实例部署不会共享当前数组                                                                       |
| 路径参数与 Pipe                      | 理解中 | 已理解 HTTP 参数运行时是字符串，ParseIntPipe 在 Controller 前转换或返回 `400`                                                |
| HTTP 400 与 404                      | 理解中 | 已能区分输入格式无效和格式有效但资源不存在                                                                                   |
| PATCH 与更新边界                     | 理解中 | 已理解只开放可更新字段，服务端 ID 不接受客户端覆盖                                                                           |
| DELETE 与 204                        | 理解中 | 已理解删除不存在返回 `404`，成功的 `204` 不包含响应体                                                                        |
| TypeORM Entity                       | 理解中 | 已能说明普通 TypeScript type 会在编译后消失，而 Entity 通过运行时元数据描述表映射                                            |
| 数据库迁移                           | 理解中 | 已能说明修改 Entity 不会在 `synchronize: false` 时自动改表，并阅读了第一份建表 migration                                     |
| TypeORM Repository                   | 理解中 | 已解释“连接数据库”不等于“业务使用数据库”，并通过真实 CRUD 替换内存数组                                                       |
| 异步数据库 I/O                       | 理解中 | Service 与 Controller 已改为返回 Promise，Controller 会等待删除完成并传播异常                                                |
| 数据库测试隔离                       | 接触过 | 单元测试 mock Repository，e2e 使用独立 `mini_saas_test` 并在每个测试前重置表和序列                                           |
| API 校验与数据库约束                 | 理解中 | 已预测并复现超长名称绕过 DTO 后由 PostgreSQL 拒绝并返回 `500`，随后对齐为 API `400`                                          |
| PostgreSQL 序列                      | 理解中 | 直接 SQL 实验证明失败插入和事务回滚可能消耗序列值，自增 ID 不保证连续                                                        |
| 数据库唯一约束                       | 理解中 | 已解释并直接验证 `UNIQUE(email)` 是并发注册和绕过 API 时的最终重复数据防线                                                   |
| 敏感字段查询边界                     | 理解中 | 已理解 TypeORM `select: false` 不属于数据库约束，直接 SQL 和显式查询仍能读取密码哈希                                         |
| 密码哈希                             | 理解中 | 已解释 salt、单向验证和慢哈希价值；真实测试证明相同密码产生不同 Argon2id 哈希并可 verify                                     |
| 用户注册                             | 理解中 | 已实现 DTO、邮箱规范化、哈希、数据库唯一竞态映射和安全公开响应，并通过真实 e2e 验证                                          |
| 跨模块 Provider                      | 接触过 | AuthModule 导入 UsersModule，UsersModule 导出 UsersService 供 AuthService 注入                                               |
| 登录凭证校验                         | 理解中 | 已能识别账号枚举风险和持续身份需求；实现登录专用查询、Argon2 verify 与统一 `401` 并通过 e2e 验证                             |
| Cookie、Session 与 JWT               | 理解中 | 已能解释 Session 的服务端状态、进程内存重启丢失和 JWT 单独撤销困难，并区分 Cookie 只是凭据载体                               |
| 服务端 Session                       | 理解中 | 已能解释 Cookie、数据库 Session、API 与 Session Secret 的协作，并正确判断篡改签名、重启和多实例场景                          |
| Guard 与当前用户                     | 接触过 | SessionAuthGuard 在 Controller 前检查 userId；`GET /auth/me` 再从数据库读取公开用户                                          |
| 一对多与外键                         | 理解中 | Project.ownerId 非空引用 User.id，直接 SQL 写入不存在 owner 被 PostgreSQL 拒绝，删除策略为 RESTRICT                          |
| 资源归属授权                         | 理解中 | 已判断登录不等于拥有资源；Projects 的创建、列表、查询、更新和删除都使用 Session userId 限定范围                              |
| CORS 与凭证请求                      | 接触过 | 已亲手配置指定前端 origin 和 credentials，并通过预检 e2e 验证响应头；正在区分浏览器 CORS、Cookie 和后端认证职责              |
| 第三方类型边界                       | 接触过 | 发现 NestJS `enableCors` 参数为 `any` 导致无补全，使用显式 CorsOptions 恢复配置对象的类型检查                                |
| Fetch 响应与错误边界                 | 理解中 | 已能区分 HTTP 失败仍 resolve、网络或 CORS 失败会 reject，以及 `204` 不能解析 JSON；亲手完成统一请求函数                      |
| 前端 API 请求封装                    | 理解中 | `apiRequest` 统一 base URL、强制携带 Session Cookie、转换 ApiError 并处理空响应，4 个 Vitest 行为测试通过                    |
| TanStack Query 服务端状态            | 接触过 | `/auth/me` 使用 Query 管理加载、成功和失败；登录与注销 Mutation 直接更新当前用户缓存，刷新后重新向 Session 求证              |
| 环境变量与启动校验                   | 理解中 | 已能判断缺失数据库或 Session 配置会启动失败、短密钥可运行但不安全、错误 CORS Origin 会导致生产联调失败；Joi 在启动前集中验证 |

## 当前学习任务

把 Mini SaaS API 与 PostgreSQL 容器化，理解镜像、容器、服务、网络、持久化卷和启动顺序分别解决什么问题。

## 下一步完成标准

- 能解释 Dockerfile、image、container 与 Compose service 的关系。
- API 和 PostgreSQL 能通过 Compose 启动，API 使用服务名而不是 localhost 连接数据库。
- 数据库 schema 通过显式 migration 建立，不依赖 `synchronize: true`。
- 重建 API 容器后数据库与 Session 数据仍保留，并能通过日志定位一次故意制造的配置或连接错误。

## 困惑与阻塞

目前没有已记录的阻塞。开始下一课时先确认可用时间，再由 Agent 根据当前知识点安排讲解、AI 演示、审查推理和少量关键编码的比例。
