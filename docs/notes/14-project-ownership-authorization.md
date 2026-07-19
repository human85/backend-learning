# 项目归属与数据授权

## 认证与授权不是一回事

- 认证 Authentication：SessionAuthGuard 确认请求来自某个已登录用户。
- 授权 Authorization：ProjectsService 确认这个用户只能操作归属于自己的项目。

Session Guard 看到 `userId` 就会放行，但它不知道具体项目属于谁。因此项目查询必须继续带上 ownerId 条件。

## 当前请求链路

```text
请求携带 Session Cookie
  → Session middleware 恢复 userId
  → SessionAuthGuard 拒绝未登录请求
  → Controller 从 Session 取得 userId
  → ProjectsService 查询 id + ownerId
  → Repository / PostgreSQL
```

创建项目只接受 DTO 中的 name：

```text
name    ← 客户端请求体
ownerId ← 已验证的 Session
```

客户端提交 ownerId 会被白名单校验拒绝，不能替其他用户创建项目。

## 为什么查询同时使用 id 和 ownerId

```sql
SELECT *
FROM projects
WHERE id = :id
  AND owner_id = :currentUserId;
```

用户访问不存在的项目和访问别人的项目都会查不到，并统一返回 404。这样既阻止越权，也不向调用者泄漏其他用户资源是否存在。

更新先用 id + ownerId 查询目标；删除直接使用 id + ownerId 作为删除条件。只在 Controller 加 Guard、Service 仍按 id 查询，会导致任何登录用户都能操作所有项目。

## 外键解决的是另一类问题

`projects.owner_id → users.id` 的非空外键保证：

- 每个项目都有 owner。
- owner 必须是数据库中真实存在的用户。
- `ON DELETE RESTRICT` 阻止直接删除仍拥有项目的用户。

外键不知道当前 HTTP 请求是谁，所以不能代替 Session 和 Service 授权条件。反过来，Guard 也不能阻止绕过 API 的 SQL 写入无效 owner，因此两层都需要。

## 复习问题

1. 为什么只在 Controller 加 SessionAuthGuard 仍可能发生越权？
2. 为什么访问别人的项目返回 404，而不是明确告诉调用者项目存在？
3. ownerId 外键和 `WHERE owner_id = currentUserId` 分别保护什么？
