# 登录凭证校验与身份状态

## 登录目前完成了什么

```text
POST /auth/login
  → LoginDto 校验输入结构
  → UsersService 显式查询 passwordHash
  → PasswordService 使用 Argon2 verify
  → AuthService 返回公开用户或统一 401
```

这条链路只证明“本次请求提供的密码正确”，还不能让后续请求知道用户是谁。

## 为什么需要登录专用查询

`UserEntity.passwordHash` 设置了 `select: false`，普通 TypeORM 查询不会从数据库读取它。Entity 实例上仍可能存在这个类字段，但值是 `undefined`。

登录必须读取哈希才能 verify，因此 UsersService 使用意图明确的 `findCredentialsByEmail()` 和 `addSelect('user.passwordHash')`。这样敏感字段的读取范围集中在凭证校验路径，而不是取消全局默认隐藏。

## 为什么失败响应必须一致

如果邮箱不存在返回 `404`，密码错误返回 `401`，攻击者就能批量确认哪些邮箱注册过。当前两种情况都返回：

```json
{
  "message": "Invalid email or password",
  "error": "Unauthorized",
  "statusCode": 401
}
```

这解决了响应内容泄漏，但生产系统还需要限流、监控，并按风险评估响应时间差异。

## Cookie、Session 与 JWT 不是同一层概念

- Cookie：浏览器保存并在匹配请求中自动携带一段数据的机制。
- Session：服务器保存登录状态，Cookie 通常只携带随机 Session ID。
- JWT：令牌自身包含声明并由服务器签名验证，也可以放进 HttpOnly Cookie。

因此“Cookie 还是 JWT”不是严格的二选一。更准确的问题是：身份状态保存在服务器 Session 中，还是编码进 JWT；浏览器通过什么方式安全携带对应凭据。

## 复习问题

1. 为什么不能为了登录方便而删除 passwordHash 的 `select: false`？
2. 为什么登录成功返回公开用户仍不能让下一次请求自动识别用户？
3. Session ID 放在 Cookie 中时，真正的登录状态分别保存在哪里？
