# 托管 PostgreSQL 与远程 migration

## 本地 Container 可以修改远程数据库

Docker Container 在本机运行不代表它只能连接本机服务。只要 `DATABASE_URL` 指向可访问的托管 PostgreSQL，它就能通过网络向远程数据库发送 SQL：

```text
Local production Image
  -> Neon public PostgreSQL endpoint
  -> execute migration SQL
  -> schema persists in Neon
```

一次性 migration Container 退出并删除后，Neon 中的表和 migration 记录不会消失。数据库状态由远程 PostgreSQL 保存，不依赖本机 Container 或本地配置文件的生命周期。

## 为什么使用生产 Image 执行

生产 Image 中只有编译后的 JavaScript 和生产依赖。使用它运行 `dist/database/data-source.js` 可以同时验证：

- migration 已被编译并复制进 Image；
- Runtime Image 包含 TypeORM 与 PostgreSQL 驱动；
- 生产连接地址和 TLS 参数可用；
- 实际部署产物有能力创建并更新 schema。

先运行 `migration:show` 是只读检查，可以确认目标数据库和待执行列表。确认后再运行 `migration:run`，最后查询 migration 记录和表名，避免只凭退出码判断成功。

## 密钥边界

托管数据库连接地址通常包含用户名和密码，应当视为密钥：

- 不粘贴到聊天、文档或命令参数；
- 本地只放在 Git 忽略的环境文件；
- Docker 使用 `--env-file` 在运行时注入，不能 COPY 进 Image；
- 部署时保存在平台 Secret 或环境变量中；
- 日志和验证命令只输出连接状态、表名和 migration 数量。
