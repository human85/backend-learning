# 当前学习进度

> 这是新 Agent 恢复教学上下文时首先读取的状态快照。

## 基本信息

- 最近更新：2026-07-19
- 学习者背景：Web 前端工程师
- 学习目标：通过真实 Mini SaaS 项目系统学习后端，逐步具备全栈开发能力
- 第一轮目标：在 2026-08-18 前借助 AI 跑通一个可部署的前端 → API → 认证授权 → PostgreSQL → 测试 → Docker → 部署闭环
- 教学偏好：中文讲解；先讲原因再讲术语；使用前端概念类比；AI 主导大部分实现；重点练习需求拆解、代码审查、故障推理和验证；只安排有助于理解记忆的少量手写代码；区分“能运行”和“工程化”

## 当前阶段

- 阶段：工程组织与 NestJS 基础
- 状态：进行中
- 30 天计划：第 1 周进行中
- 当前焦点项目：`apps/mini-saas/`
- 实践进度：Projects CRUD 已从内存数组迁移到 TypeORM Repository；开发库与测试库分离，e2e 已验证 API 重启后数据仍然存在

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

## 当前学习任务

对齐 API 输入校验与数据库列约束：分析超过 100 字符的项目名称为什么会绕过 DTO、被 PostgreSQL 拒绝并形成错误的 HTTP 语义。

## 下一步完成标准

- 能区分 DTO 运行时校验与数据库 `varchar(100) NOT NULL` 约束各自拒绝什么输入。
- 为创建和更新 DTO 增加一致的长度规则，并用 e2e 验证客户端收到 `400` 而不是数据库错误导致的 `500`。
- 使用 `psql` 直接尝试空字符串、`NULL` 和超长名称，观察数据库约束与 API 规则的差异。

## 困惑与阻塞

目前没有已记录的阻塞。开始下一课时先确认可用时间，再由 Agent 根据当前知识点安排讲解、AI 演示、审查推理和少量关键编码的比例。
