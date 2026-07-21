# 同源 Rewrite 与 Cookie 边界

## Origin、Site 和 Cookie 不是同一个概念

两个 URL 是否同源取决于 scheme、host 和 port。Cookie 的 SameSite 判断还会使用 Public Suffix List。onrender.com 是公共后缀，因此下面两个地址属于不同 Site：

```text
frontend-name.onrender.com
api-name.onrender.com
```

前端 fetch 设置 `credentials: 'include'` 只表示允许浏览器携带凭证，不会覆盖 Cookie 自身的 SameSite 限制。SameSite=Lax 不会随这种跨站 fetch 发送。

## 两种解决方向

跨站方案使用 `SameSite=None; Secure`，还要处理第三方 Cookie 限制和更完整的 CSRF 防护。当前学习项目选择同源方案：

```text
Browser -> https://frontend.onrender.com/api/auth/login
Render Static Rewrite -> https://api.onrender.com/auth/login
```

浏览器地址始终是前端 Origin，Render 在服务端转发请求。Set-Cookie 也通过前端响应返回，因此 Session Cookie 能继续使用 SameSite=Lax。

## 前端构建配置

Vite 的 `VITE_API_BASE_URL` 会在 build 时写入浏览器 bundle，不是运行时秘密：

- 本地未配置：`http://localhost:3000`；
- Render Static Site：`/api`。

部署验证不能只看构建成功，应检查最终 bundle 不含 localhost，并用真实浏览器确认请求 URL、Set-Cookie、刷新恢复和注销行为。
