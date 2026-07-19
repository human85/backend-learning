# User 表与敏感字段边界

## 第一版 User 表

```text
users
  id             SERIAL PRIMARY KEY
  email          varchar(254) NOT NULL UNIQUE
  password_hash  varchar(255) NOT NULL
  created_at     timestamptz NOT NULL DEFAULT now()
```

- `id` 是其他表将来引用用户的稳定标识。
- `email` 是登录标识，数据库唯一约束负责阻止并发请求或绕过 API 造成的重复值。
- `password_hash` 只保存哈希，永远不保存明文密码。
- `created_at` 由数据库生成，所有写入入口获得一致的服务器时间。

## 唯一约束为什么不能只放在 Service

两个注册请求可能同时查询到“邮箱不存在”，然后同时尝试插入。Service 的提前查询用于返回友好的业务错误，数据库 `UNIQUE` 才是并发和旁路写入下的最终保证。

当前 `varchar` 唯一约束区分大小写，因此注册流程仍需先把邮箱规范化为小写。是否需要数据库层的大小写不敏感类型或函数索引，留到出现更完整需求时再决定。

## `select: false` 不是保密边界

TypeORM Entity 将 `passwordHash` 标记为 `select: false`，只表示普通 Repository 查询默认不选择该列：

- 显式查询仍可选择它，登录验证也必须这样做。
- 直接 SQL 的 `SELECT *` 仍会返回它。
- `save()` 返回的内存对象可能仍然带有哈希。

因此注册和登录响应必须明确选择公开字段，不能把 Entity 直接当作安全响应 DTO。

## 复习问题

1. Service 已经查询邮箱不存在，为什么数据库还需要 `UNIQUE`？
2. `select: false` 为什么不能保证密码哈希永远不会出现在响应中？
3. 为什么保存 `password_hash` 后仍然无法解密出用户原密码？
