# 密码哈希与用户注册

## 为什么不能使用普通快速哈希

SHA-256 等快速哈希适合校验文件完整性，但不适合直接保存密码，因为攻击者可以高速尝试大量候选密码。密码哈希应刻意消耗 CPU 和内存，提高离线暴力破解成本。

当前项目使用 Argon2id：

```text
memoryCost = 19 MiB
timeCost = 2
parallelism = 1
```

Argon2 输出的 PHC 字符串包含算法、参数、随机 salt 和哈希。salt 不需要保密；同一密码每次生成不同哈希，登录时使用 `verify(storedHash, inputPassword)`，不能解密哈希或重新生成字符串后直接比较。

## 注册请求链路

```text
POST /auth/register
  → RegisterDto 校验邮箱和密码长度
  → AuthService 规范化邮箱并检查重复
  → PasswordService 生成 Argon2id 哈希
  → UsersService 保存 UserEntity
  → AuthService 只返回 id、email、createdAt
```

- UsersService 只负责用户数据查询与保存。
- AuthService 负责凭证规则、密码哈希、冲突映射和公开响应。
- PasswordService 隔离 Argon2，让 AuthService 单元测试可以使用快速 mock，真实算法由 PasswordService 测试和 e2e 覆盖。

## 重复邮箱的两层保护

AuthService 先查询邮箱是否存在，用于尽早返回 `409 Conflict`。数据库 `UNIQUE(email)` 继续处理并发竞态：两个请求可能同时通过查询，最终只有一个插入成功。PostgreSQL 唯一冲突代码 `23505` 也会被映射为 `409`，而不是泄漏为 `500`。

## 密码和响应边界

- 注册 DTO 接受 `password`，不接受客户端提供的 `passwordHash`。
- 第一版允许 15–128 字符，不强制字符组合，支持 passphrase。
- UserEntity 的 `select: false` 只是查询默认值，不能替代安全响应映射。
- 注册成功只返回公开字段；任何 Entity 新增敏感字段都不会自动进入响应。

## 复习问题

1. 为什么相同密码生成的两个 Argon2id 哈希不同？
2. 为什么 AuthService 查询过重复邮箱后，仍需捕获数据库 `23505`？
3. 为什么不能直接把 `usersRepository.save()` 的结果作为注册响应？
