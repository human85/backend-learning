# 当前学习进度

> 这是新 Agent 恢复教学上下文时首先读取的状态快照。

## 基本信息

- 最近更新：2026-07-21
- 学习者背景：Web 前端工程师
- 学习目标：通过真实 Mini SaaS 项目系统学习后端，逐步具备全栈开发能力
- 第一轮目标：在 2026-08-18 前借助 AI 跑通一个可部署的前端 → API → 认证授权 → PostgreSQL → 测试 → Docker → 部署闭环
- 教学偏好：中文讲解；先讲原因再讲术语；使用前端概念类比；AI 主导大部分实现；重点练习需求拆解、代码审查、故障推理和验证；只安排有助于理解记忆的少量手写代码；区分“能运行”和“工程化”；前端只用于验证全栈链路，不重复讲解学习者已经掌握的前端实现

## 当前阶段

- 阶段：部署与闭环验收
- 状态：进行中
- 30 天计划：第 1、2、3 周已完成，开始第 4 周
- 当前焦点项目：`apps/mini-saas/` 与 `apps/mini-saas-web/`
- 实践进度：个人 Render Free API 已从 GitHub Dockerfile 成功构建并上线，公网健康检查、CORS、Secure Cookie、注册登录、当前用户、Projects CRUD 和注销均与 Neon 真实数据库验证通过；前端已改为构建时读取 API 基地址，并决定用静态站点 `/api` Rewrite 保持同源和 SameSite=Lax，下一步创建静态站点并验证浏览器闭环

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
| Docker Image 与 Container            | 理解中 | 已能解释 Dockerfile、Image、Container 和 Volume 的区别；成功运行 hello-world 并构建 Mini SaaS 多阶段生产 Image               |
| Docker Compose 与容器网络            | 理解中 | 已运行 postgres、migrate、api 三个 Service，验证服务名连接、宿主机端口映射、健康检查、migration 顺序和 Volume 持久化         |
| 容器状态与日志诊断                   | 理解中 | 能区分 running、healthy、Exited (0) 与 Exited (1)，并根据 ENOTFOUND、ECONNREFUSED、28P01 和 42P01 判断故障所在层             |
| HTTPS 代理与 Secure Cookie           | 接触过 | 已预测 Cookie 未正确携带会导致登录 `200` 后 `/auth/me` 仍为 `401`；e2e 验证生产环境需要信任前置 HTTPS 代理                   |
| 托管 PostgreSQL 与线上 migration     | 接触过 | 已通过被忽略的本地连接配置，让生产 Docker Image 对 Neon 执行 4 条 migration，并查询确认表结构和迁移记录                      |
| Render Docker 部署与线上验收         | 接触过 | 已从个人 GitHub 构建 Docker Image；公网验证健康、CORS、认证、Secure Cookie、资源 CRUD、注销和 Neon 数据清理                  |
| 同源代理与跨站 Cookie                | 接触过 | 确认 onrender.com 是公共后缀；选择静态站点 `/api` Rewrite 到 API，避免 SameSite=None、第三方 Cookie 和额外 CSRF 暴露         |

## 当前学习任务

部署免费前端并连接 Render API，在真实浏览器中验证 HTTPS、CORS、跨站 Cookie、Session 和页面刷新恢复身份。

## 下一步完成标准

- 前端构建时读取线上 API 地址，并部署为免费静态站点。
- API 的 `FRONTEND_ORIGIN` 与真实前端 URL 完全一致，浏览器预检通过。
- 真实浏览器完成注册、登录、刷新恢复和注销；若跨站 Cookie 被 SameSite 阻止，先用网络证据复现再修复。
- 重新部署或重启 API 后，原 Session 仍能从 Neon 恢复。

## 困惑与阻塞

目前没有已记录的阻塞。开始下一课时先确认可用时间，再由 Agent 根据当前知识点安排讲解、AI 演示、审查推理和少量关键编码的比例。
