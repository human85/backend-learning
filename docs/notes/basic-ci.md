# Mini SaaS 基础 CI

工作流在 `main` 的 push 和任意 pull request 运行，目标是让关键 API 回归在合并前失败。

`checkout → pnpm install --frozen-lockfile → format → read-only lint → unit tests → test migrations → HTTP e2e → build → git diff`

- 单元测试适合 Service 的独立规则；DTO 校验必须用 HTTP e2e，才会经过 `ValidationPipe`。例如短密码注册应返回 400；移除 `@MinLength` 后会得到 201，e2e 会失败。
- CI PostgreSQL 是 GitHub Actions job 的 `postgres:17` service，数据库名为 `mini_saas_test`。连接串、测试用 Session Secret 和前端来源只从工作流环境变量读取；不提交或复制本机 `.env.test.local`。
- 首次远端运行曾发现 readiness e2e 在环境变量选择前无条件读取本机文件。测试现改为先读取 `DATABASE_URL`，只在本地变量缺失时读取 `.env.test.local`；这让本机便利配置不再成为 CI 的隐式前提。
- migration 必须先于 e2e：应用测试会查询 users、sessions 与 projects 表；新 runner 的数据库没有 schema。迁移成功也不证明 HTTP 合同、权限或业务规则正确，仍需要 e2e。
- lint 在 CI 中没有 `--fix`，格式检查也不写文件；最后检查 diff，避免“CI 通过但静默改写代码”的情况。
- 当前范围只覆盖 Mini SaaS 后端。Hono 的集成测试会清理教学表，前端、浏览器和生产部署各有不同的隔离与验收需要，未因为新增 CI 自动获得覆盖。

实现见 [mini-saas-ci.yml](../../.github/workflows/mini-saas-ci.yml)。工作流动作的版本选择参考 [actions/checkout](https://github.com/actions/checkout/releases)、[actions/setup-node](https://github.com/actions/setup-node/releases) 与 [pnpm/action-setup](https://github.com/pnpm/action-setup/releases)。首次 GitHub runner 成功只证明该环境可重复执行这些检查，不能取代发布后验收。
