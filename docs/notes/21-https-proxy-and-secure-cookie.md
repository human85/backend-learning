# HTTPS 代理与 Secure Cookie

## 为什么浏览器是 HTTPS，NestJS 却可能看到 HTTP

托管平台通常在应用 Container 前接收 HTTPS，再通过内部网络把 HTTP 转发给 NestJS：

```text
Browser --HTTPS--> Platform proxy --HTTP--> NestJS Container
```

代理会用 `X-Forwarded-Proto: https` 告诉应用原始请求协议。Express 默认不信任代理提供的转发信息；如果生产 Session Cookie 设置了 `secure: true`，应用可能无法判断原始请求安全，导致响应没有正确设置 Secure Cookie。

典型现象是登录业务返回 `200`，但浏览器没有可用于后续请求的 Session Cookie，因此紧接着访问 `/auth/me` 返回 `401`。

## 为什么设置 trust proxy 为 1

生产环境设置 `trust proxy = 1` 表示只信任距离应用最近的一层代理，而不是无条件信任任意来源提供的转发头。本地开发不需要这项配置，因为浏览器直接通过 HTTP 访问 NestJS，Cookie 也没有启用 Secure。

## 应该测试什么

测试应用显式使用 production 配置，并用 `X-Forwarded-Proto: https` 模拟平台代理。登录响应必须同时包含：

- Session Cookie 名称和值；
- `HttpOnly`；
- `SameSite=Lax`；
- `Secure`。

测试配置应通过依赖注入覆盖 ConfigService，不能依赖运行中临时修改全局 `process.env`。ConfigModule 可能已经加载并缓存测试环境配置，直接修改进程变量既不可靠也容易污染其他测试。
