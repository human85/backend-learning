# Compose 网络、健康检查与 Volume

## Compose 解决什么问题

Dockerfile 描述单个 Image 如何构建，Compose 描述多个 Service 如何一起运行。Mini SaaS 的本地 Compose 包含：

```text
postgres --healthy--> migrate --completed successfully--> api
```

- `postgres` 运行官方 PostgreSQL 17 Image。
- `migrate` 使用 API Image 执行编译后的 TypeORM migration，成功后退出。
- `api` 等待 migration 成功，再启动 NestJS。

只保证 Container 先启动不代表服务已经 ready。PostgreSQL 使用 `pg_isready` healthcheck；Compose 的 `service_healthy` 等待健康，`service_completed_successfully` 等待一次性任务以状态码 0 退出。

## 两层网络地址

Compose 自动创建内部网络，Service 名就是内部主机名：

```text
API Container -> postgres:5432
```

Container 内的 localhost 只指向自己，不能用它寻找 PostgreSQL Service。

端口映射 `5433:5432` 表示：

```text
Mac localhost:5433 -> PostgreSQL Container :5432
```

容器间通信不需要经过 Mac 的 5433。Mac 本地 PostgreSQL 可以继续占用 5432，因为只有宿主机映射端口不能冲突。

## Volume 与数据生命周期

具名 Volume 挂载到 PostgreSQL 17 的 `/var/lib/postgresql/data`。重建 PostgreSQL Container 时，新实例重新挂载同一 Volume，因此表、migration、用户和 Session 都保留。

常用命令的边界：

- `docker compose stop`：停止 Container，保留 Container 和 Volume。
- `docker compose down`：删除 Compose Container 和 Network，默认保留具名 Volume。
- `docker compose down --volumes`：同时删除 Volume，数据库数据会丢失，必须明确知道后果再使用。

## migration 是一次性 Service

API 启动时自动 migration 在单实例时能运行，但多个 API 实例可能同时争抢 schema 变更。当前 Compose 使用独立 migration Service：数据库健康后执行一次，成功退出后 API 才能启动。

`synchronize` 仍为 false。数据库 schema 的历史和变更由 migration 明确管理。

## 本地 HTTP 与生产 HTTPS

生产模式的 Session Cookie 带 Secure，只能通过 HTTPS 回传。本地 Compose 使用 `http://localhost`，因此显式覆盖 `NODE_ENV=development`；生产部署必须恢复 production 并提供 HTTPS，不能为了让 Cookie 工作而关闭生产 Secure。

## 复习问题

1. 为什么 `depends_on` 只有启动顺序还不够？
2. API 为什么连接 `postgres:5432`，而 Mac 上的 psql 连接 `localhost:5433`？
3. migration Service 为什么正常状态是 `Exited (0)`？
4. `docker compose down` 与 `docker compose down --volumes` 的数据后果有什么不同？
