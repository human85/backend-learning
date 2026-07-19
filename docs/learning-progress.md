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
- 实践进度：ProjectsModule 已支持进程内创建、列表和按 ID 查询；路径参数通过 ParseIntPipe 转换，不存在的项目返回 `404`

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

## 当前学习任务

完成项目更新与删除，学习 PATCH 的部分更新语义、DELETE 的状态码和修改内存集合时的业务规则。

## 下一步完成标准

- 增加 UpdateProjectDto，只允许提交需要修改的字段。
- 使用 `PATCH /projects/:id` 更新项目名称。
- 使用 `DELETE /projects/:id` 删除项目，并选择合适的成功状态码。
- 更新或删除不存在的项目时保持一致的 `404` 行为。

## 困惑与阻塞

目前没有已记录的阻塞。开始下一课时先确认可用时间，再由 Agent 根据当前知识点安排讲解、AI 演示、审查推理和少量关键编码的比例。
