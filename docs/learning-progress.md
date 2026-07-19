# 当前学习进度

> 这是新 Agent 恢复教学上下文时首先读取的状态快照。

## 基本信息

- 最近更新：2026-07-19
- 学习者背景：Web 前端工程师
- 学习目标：通过真实 Mini SaaS 项目系统学习后端，逐步具备全栈开发能力
- 第一轮目标：在 2026-08-18 前借助 AI 跑通一个可部署的前端 → API → 认证授权 → PostgreSQL → 测试 → Docker → 部署闭环
- 教学偏好：中文讲解；先讲原因再讲术语；使用前端概念类比；AI 主导大部分实现；重点练习需求拆解、代码审查、故障推理和验证；只安排有助于理解记忆的少量手写代码；区分“能运行”和“工程化”

## 当前阶段

- 阶段：数据边界、认证与授权
- 状态：进行中
- 30 天计划：第 1 周已完成，开始第 2 周
- 当前焦点项目：`apps/mini-saas/`
- 实践进度：Projects CRUD 已持久化；注册与登录凭证校验已完成，登录专用查询显式加载密码哈希，失败统一返回 `401`

## 已接触的知识

| 知识点 | 程度 | 证据或说明 |
| --- | --- | --- |
| 后端请求链路 | 理解中 | 已了解 Controller → Service → Repository/ORM → Database |
| 前后端职责边界 | 理解中 | 已理解前端负责体验、后端负责规则和校验 |
| Controller、Service、Repository 分工 | 理解中 | 已通过“创建项目”示例串联，但尚未编码 |
| Repository 名称与作用 | 理解中 | 已理解它抽象某类数据的存取入口 |
| Monorepo 与 pnpm Workspace | 理解中 | 已能解释两者区别、依赖归属和根级命令与 `--filter` 的范围 |
| NestJS 启动与请求阶段 | 理解中 | 已能区分 `main.ts` 启动应用与 Controller、Service 处理请求 |
| 依赖注入 | 理解中 | 已理解 Controller 不负责创建 Service，并观察了 `useValue` 测试替换 |
| 单元测试与 e2e | 理解中 | 已能根据 mock 和真实应用的执行边界判断测试结果 |
| DTO 与运行时校验 | 理解中 | 已能区分 TypeScript 类型描述与 ValidationPipe 的实际校验职责 |
| 白名单输入 | 理解中 | 已理解 `whitelist` 清理字段、`forbidNonWhitelisted` 拒绝额外字段 |
| NestJS feature module | 理解中 | 已理解 `imports`、`controllers`、`providers` 的注册关系和缺失时的故障表现 |
| Provider 实例状态 | 理解中 | 已能解释同一应用内请求共享 Service 状态，而 e2e 的新应用实例会重置数组 |
| 内存数据与持久化 | 理解中 | 已理解进程重启、重新实例化或多实例部署不会共享当前数组 |
| 路径参数与 Pipe | 理解中 | 已理解 HTTP 参数运行时是字符串，ParseIntPipe 在 Controller 前转换或返回 `400` |
| HTTP 400 与 404 | 理解中 | 已能区分输入格式无效和格式有效但资源不存在 |
| PATCH 与更新边界 | 理解中 | 已理解只开放可更新字段，服务端 ID 不接受客户端覆盖 |
| DELETE 与 204 | 理解中 | 已理解删除不存在返回 `404`，成功的 `204` 不包含响应体 |
| TypeORM Entity | 理解中 | 已能说明普通 TypeScript type 会在编译后消失，而 Entity 通过运行时元数据描述表映射 |
| 数据库迁移 | 理解中 | 已能说明修改 Entity 不会在 `synchronize: false` 时自动改表，并阅读了第一份建表 migration |
| TypeORM Repository | 理解中 | 已解释“连接数据库”不等于“业务使用数据库”，并通过真实 CRUD 替换内存数组 |
| 异步数据库 I/O | 理解中 | Service 与 Controller 已改为返回 Promise，Controller 会等待删除完成并传播异常 |
| 数据库测试隔离 | 接触过 | 单元测试 mock Repository，e2e 使用独立 `mini_saas_test` 并在每个测试前重置表和序列 |
| API 校验与数据库约束 | 理解中 | 已预测并复现超长名称绕过 DTO 后由 PostgreSQL 拒绝并返回 `500`，随后对齐为 API `400` |
| PostgreSQL 序列 | 理解中 | 直接 SQL 实验证明失败插入和事务回滚可能消耗序列值，自增 ID 不保证连续 |
| 数据库唯一约束 | 理解中 | 已解释并直接验证 `UNIQUE(email)` 是并发注册和绕过 API 时的最终重复数据防线 |
| 敏感字段查询边界 | 理解中 | 已理解 TypeORM `select: false` 不属于数据库约束，直接 SQL 和显式查询仍能读取密码哈希 |
| 密码哈希 | 理解中 | 已解释 salt、单向验证和慢哈希价值；真实测试证明相同密码产生不同 Argon2id 哈希并可 verify |
| 用户注册 | 理解中 | 已实现 DTO、邮箱规范化、哈希、数据库唯一竞态映射和安全公开响应，并通过真实 e2e 验证 |
| 跨模块 Provider | 接触过 | AuthModule 导入 UsersModule，UsersModule 导出 UsersService 供 AuthService 注入 |
| 登录凭证校验 | 理解中 | 已能识别账号枚举风险和持续身份需求；实现登录专用查询、Argon2 verify 与统一 `401` 并通过 e2e 验证 |
| Cookie、Session 与 JWT | 接触过 | 已理解登录后仍需持久化身份；正在区分 Cookie 传输载体、服务端 Session 和自包含 JWT 的职责 |

## 当前学习任务

选择登录状态保持方案：区分 Cookie、Session 和 JWT 的职责与安全边界，为浏览器端 Mini SaaS 选择第一版方案。

## 下一步完成标准

- 能说明 Cookie 是浏览器保存并自动携带数据的机制，不等同于 Session 或 JWT。
- 能比较服务端 Session ID Cookie 与 JWT Cookie 的状态位置、注销方式和复杂度。
- 为当前浏览器端 Mini SaaS 选择一种第一版方案，并说明 CSRF、XSS、过期和密钥配置中的基本边界。
- 用 e2e 验证登录后能够访问受保护接口，未登录请求被拒绝。

## 困惑与阻塞

目前没有已记录的阻塞。开始下一课时先确认可用时间，再由 Agent 根据当前知识点安排讲解、AI 演示、审查推理和少量关键编码的比例。
