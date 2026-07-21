# 容器状态与日志诊断

## 先看状态，再看日志

固定排查顺序可以避免无目的地重启服务：

```text
docker compose ps --all
  -> 找到第一个异常或未执行的 Service
  -> docker compose logs --tail=100 <service>
  -> 根据错误层级查看上游或下游 Service 日志
```

- `Up` 表示 Container 进程还在运行。
- `healthy` 表示 healthcheck 已通过。
- `Exited (0)` 表示进程正常完成，适用于 migration 等一次性任务。
- `Exited (1)` 等非零状态表示进程失败。

## 数据库连接的故障层级

```text
服务名解析 -> TCP 端口 -> PostgreSQL 认证 -> schema -> API 业务
```

| 典型错误                               | 已经证明什么                 | 优先检查什么                       |
| -------------------------------------- | ---------------------------- | ---------------------------------- |
| `ENOTFOUND postgres`                   | 尚未找到目标地址             | Compose 服务名、网络和 DNS         |
| `ECONNREFUSED postgres:5432`           | 地址已解析，但端口未接受连接 | PostgreSQL 进程、端口和 ready 状态 |
| `28P01 password authentication failed` | 请求已抵达 PostgreSQL        | 用户名、密码和目标数据库配置       |
| `42P01 relation does not exist`        | 连接和认证均成功             | migration、schema 和是否连错数据库 |

错误密码不能称为“数据库连接成功”：TCP 已连接到 PostgreSQL，但认证没有通过，数据库会话尚未建立。

## 客户端与服务端日志要对应

API 或 migration 是数据库客户端，PostgreSQL 是服务端。同一次失败可能在两侧留下不同视角的日志。若客户端声称目标数据库拒绝认证，而该 PostgreSQL 完全没有对应记录，应继续确认 `DATABASE_URL` 是否指向了另一实例。

`docker compose logs -f api` 会持续跟踪 API 输出；按 `Ctrl+C` 只停止查看日志，不会停止 Container。使用 `docker compose run --rm` 创建的临时 Container 会在退出后删除，其历史日志也不再通过 Container 查询，因此重要实验要保留终端输出或查看 PostgreSQL 一侧记录。
