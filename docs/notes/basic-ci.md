# Mini SaaS 基础 CI

工作流在 `main` 的 push 和任意 pull request 运行，目标是让关键 API 回归在合并前失败。

`checkout → pnpm install --frozen-lockfile → format → read-only lint → unit tests → test migrations → HTTP e2e → build → git diff`

- 单元测试适合 Service 的独立规则；DTO 校验必须用 HTTP e2e，才会经过 `ValidationPipe`。例如短密码注册应返回 400；移除 `@MinLength` 后会得到 201，e2e 会失败。
- CI PostgreSQL 是 GitHub Actions job 的 `postgres:17` service，数据库名为 `mini_saas_test`。连接串、测试用 Session Secret 和前端来源只从工作流环境变量读取；不提交或复制本机 `.env.test.local`。
- 首次远端运行曾发现 readiness e2e 在环境变量选择前无条件读取本机文件。测试现改为先读取 `DATABASE_URL`，只在本地变量缺失时读取 `.env.test.local`；这让本机便利配置不再成为 CI 的隐式前提。
- 修复后的 [GitHub Actions run 34202748980](https://github.com/human85/backend-learning/actions/runs/34202748980) 在 59 秒内通过。这个结果是隔离 runner 的工程证据；它不表示线上数据库、浏览器部署或所有工作区项目已验证。
- migration 必须先于 e2e：应用测试会查询 users、sessions 与 projects 表；新 runner 的数据库通常没有当前 schema。迁移成功也不证明 HTTP 合同、权限或业务规则正确，仍需要 e2e。migration 可能包含受控的数据变换，但不应把测试数据库的临时种子数据误当作生产数据验证。
- lint 在 CI 中没有 `--fix`，格式检查也不写文件；最后检查 diff，避免“CI 通过但静默改写代码”的情况。
- 当前范围只覆盖 Mini SaaS 后端。Hono 的集成测试会清理教学表，前端、浏览器和生产部署各有不同的隔离与验收需要，未因为新增 CI 自动获得覆盖。

实现见 [mini-saas-ci.yml](../../.github/workflows/mini-saas-ci.yml)。工作流动作的版本选择参考 [actions/checkout](https://github.com/actions/checkout/releases)、[actions/setup-node](https://github.com/actions/setup-node/releases) 与 [pnpm/action-setup](https://github.com/pnpm/action-setup/releases)。首次 GitHub runner 成功只证明该环境可重复执行这些检查，不能取代发布后验收。

生产 smoke test 不应复用固定 `test@example.com` 或 `temp` 项目名。使用带唯一标记的临时邮箱和项目名，在 `finally` 中删除并核对数据库状态；删除失败时保留 Request ID 和失败响应，先查日志与归属/约束，再决定补偿动作。CI 的清表 e2e 与生产 smoke test 是两种不同的风险边界。

清理验收至少检查 projectId 对应项目、唯一临时邮箱对应用户和本次 Session 是否都不存在，并比较 smoke test 前后的 Session 数量。HTTP 204 只代表接口响应，不是数据库清理证明；本应用没有公开删除用户 API，用户删除必须通过受控的管理路径完成。

当前 Mini SaaS 的清理约束是：先删除项目，再销毁 Session，最后删除用户。项目外键使用 `ON DELETE RESTRICT`；sessions 表把用户信息存于 JSON，没有数据库外键，因此先删用户可能留下逻辑孤儿 Session。清理步骤应互相独立并汇总失败，而不是因第一步异常直接跳过其余步骤。

DELETE 的 HTTP 幂等性不要求每次响应码相同：本项目首次删除返回 204，已删除资源的重试返回 404，但资源状态仍保持不存在。它不是 HTTP safe method，因为请求会改变状态；是否重试还要受目标 ID、认证归属和日志/数据库证据约束。

若实际出现用户已删而项目仍在，先假设外键被绕过、迁移不一致或数据损坏；使用 smoke test 保存的项目主键做定向补偿。不要直接执行“删除所有 owner 不存在的项目”，因为这会扩大清理范围并掩盖其他故障。

线上 smoke test 还需要先核对部署版本或 commit SHA、目标环境和配置来源。平台显示部署成功以及 `/health`、`/ready` 返回正常，只能说明某个实例可响应；无法确认版本时，业务结果不能归因于当前改动。

即使注册、登录、创建、删除和注销的 HTTP 合同全部通过，只要数据库仍有本次临时 Session，就不能判定 smoke 通过。应保存对象 ID 和 Request ID，确认残留记录归属后定向清理，并再次查询项目、用户和 Session 状态。
