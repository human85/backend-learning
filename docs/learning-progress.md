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
- 实践进度：ProjectsModule 已完成进程内 CRUD；TypeORM 已连接本机 PostgreSQL 17，第一份 migration 已创建并执行 `projects` 表，但 Service 尚未从内存数组迁移到 Repository

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

## 当前学习任务

将 ProjectsService 从内存数组迁移到 TypeORM Repository，同时保持现有 HTTP 合同，并调整测试隔离策略。

## 下一步完成标准

- 能解释“应用已连接数据库”和“业务数据已经写入数据库”不是同一件事。
- 能说明 Repository 如何替代数组的增删改查，以及数据库 I/O 为什么使 Service 方法变为异步。
- 单元测试通过 mock Repository 验证 Service 规则，e2e 使用真实数据库并保持测试隔离。
- 重启 NestJS 后，Projects CRUD 数据仍然存在。

## 困惑与阻塞

目前没有已记录的阻塞。开始下一课时先确认可用时间，再由 Agent 根据当前知识点安排讲解、AI 演示、审查推理和少量关键编码的比例。
