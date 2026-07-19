# 服务端 Session 与 HttpOnly Cookie

## 当前身份链路

```text
POST /auth/login
  → 校验邮箱和密码
  → regenerate Session ID
  → PostgreSQL sessions.sess 保存 userId
  → Set-Cookie 返回签名后的随机 Session ID

后续请求
  → 浏览器自动携带 Cookie
  → Session middleware 查询 PostgreSQL
  → request.session.userId
  → SessionAuthGuard 放行或返回 401
```

Cookie 中没有邮箱、角色或密码哈希。它只是指向服务端 Session 的无业务含义标识；真实身份状态保存在 PostgreSQL。

## 为什么不用 MemoryStore

进程内 Session 与之前的内存 Projects 数组有同样问题：API 重启后丢失，多实例之间互不共享，并且默认 MemoryStore 不适合生产。PostgreSQL store 让不同 API 实例可以读取同一份 Session，也便于按 sid 删除和注销。

## 登录为什么要 regenerate

攻击者如果提前让受害者使用一个攻击者已知的 Session ID，登录后仍沿用该 ID，可能形成 Session Fixation。凭证校验成功后生成新 ID，可以切断登录前后的会话标识。

`express-session` 的 regenerate 会替换 `request.session` 对象。因此必须在回调里重新读取 `request.session`，不能继续修改调用前保存的旧对象引用。

## Cookie 安全属性

- `HttpOnly`：前端 JavaScript 不能通过 document.cookie 读取 Session ID，降低凭据被 XSS 直接窃取的风险。
- `SameSite=Lax`：限制大部分跨站请求自动携带 Cookie，提供基础 CSRF 缓解，但不能替代完整的 CSRF 风险评估。
- `Secure`：生产环境只通过 HTTPS 发送 Cookie；反向代理部署还要正确配置可信代理。
- `Path=/`：Cookie 适用于整个当前站点，不设置 Domain，避免无意扩大到子域。

当前使用非持久 Cookie，关闭浏览器后客户端标识消失；服务端过期记录由 PostgreSQL store 定期清理。生产阶段仍需根据产品要求确定空闲超时、绝对过期、CSRF 和并发登录策略。

## 注销与当前用户

- `POST /auth/logout` 删除服务端 Session，并让浏览器清除 Cookie。
- `GET /auth/me` 先经过 SessionAuthGuard，再根据 userId 查询用户表；如果用户已被删除，即使旧 Session 仍存在也返回 `401`。
- Guard 只回答“能否进入”，业务 Service 继续负责读取用户和返回公开字段。

## 复习问题

1. 为什么 PostgreSQL 中只存 Session，浏览器没有 Cookie 时仍不能恢复登录？
2. 为什么 Cookie 使用 HttpOnly 后，前端依然可以正常发起已登录请求？
3. 为什么 SessionAuthGuard 不能代替后续的 Project ownerId 查询条件？
