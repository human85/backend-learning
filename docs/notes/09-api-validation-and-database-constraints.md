# API 校验与数据库约束

## 为什么两层都需要

API 校验和数据库约束不是重复劳动，它们保护的是不同边界：

- DTO 与 ValidationPipe 尽早拒绝客户端错误，并返回清晰的 `400 Bad Request`。
- 数据库约束保护所有写入路径，包括脚本、迁移、管理工具和其他服务直接写数据库。

当前项目名称在代码中共享 `PROJECT_NAME_MAX_LENGTH = 100`：CreateProjectDto 和 UpdateProjectDto 使用 `MaxLength(100)`，ProjectEntity 将列映射为 `varchar(100) NOT NULL`。

## 实际输入差异

| 输入 | API 规则 | PostgreSQL 规则 |
| --- | --- | --- |
| `''` | `IsNotEmpty` 拒绝并返回 `400` | 不是 `NULL`，单独依靠 `NOT NULL` 会接受 |
| `NULL` | `IsString` 拒绝并返回 `400` | `NOT NULL` 拒绝 |
| 101 字符 | `MaxLength(100)` 拒绝并返回 `400` | `varchar(100)` 拒绝 |

增加 `MaxLength` 前，101 字符能够进入 Controller 和 Service，最后由 PostgreSQL 抛出 `22001`，NestJS 因为没有把该数据库错误映射为客户端错误而返回 `500`。数据虽然安全，但 HTTP 语义错误。

## 数据库自增不保证连续

`SERIAL` 使用独立序列生成 ID。失败的插入和回滚的事务都可能已经调用序列，因此即使表中没有新增记录，序列值也可能向前移动。

```text
主键保证：唯一、非空
序列提供：自动生成下一个值
序列不保证：没有空号、严格连续
```

业务代码不应依赖 ID 连续，也不应为了填补空号而手工复用 ID。

## 复习问题

1. 为什么数据库已经有 `varchar(100)`，DTO 仍需要 `MaxLength(100)`？
2. 为什么 `NOT NULL` 不会拒绝空字符串？
3. 表中只有 ID 1 和 3，能否说明 ID 2 的数据一定被删除过？
