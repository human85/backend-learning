# CORS 与携带凭证的浏览器请求

## CORS 解决什么问题

浏览器使用 scheme、host 和 port 判断 Origin。`http://localhost:5173` 与 `http://localhost:3000` 端口不同，因此是跨 Origin 请求。

CORS 决定浏览器中的前端代码能否读取跨 Origin 响应。它不是认证或授权机制：Postman、curl 和其他服务器程序不受浏览器 CORS 策略限制，后端仍必须使用 Guard 和资源归属条件保护数据。

## Cookie Session 需要前后端配合

后端必须返回具体允许的前端 Origin，并允许凭证：

```ts
const corsOptions: CorsOptions = {
  origin: 'http://localhost:5173',
  credentials: true,
};
```

前端跨 Origin 请求必须显式携带凭证：

```ts
fetch('http://localhost:3000/auth/me', {
  credentials: 'include',
});
```

带凭证时不能把允许来源设置为 `*`。浏览器要求响应中的 `Access-Control-Allow-Origin` 是与请求匹配的具体来源，并要求 `Access-Control-Allow-Credentials: true`。

HttpOnly Cookie 不能由前端 JavaScript 读取，但浏览器可以自动保存和发送。前端通过 `/auth/me` 获取当前公开用户，而不是解析 Session Cookie。

## 预检请求

浏览器可能先发送 OPTIONS 请求，询问服务器是否允许目标 Origin、HTTP 方法和请求头。当前 e2e 直接发送 OPTIONS，并验证以下响应头：

- `Access-Control-Allow-Origin: http://localhost:5173`
- `Access-Control-Allow-Credentials: true`

## 类型边界

当前 NestJS 的通用 `INestApplication.enableCors()` 把 options 声明为 `any`，因此对象内部没有可靠补全，拼错字段也可能不报错。把独立配置对象标注为公开的 CorsOptions，可以主动收窄第三方库过宽的类型边界。

## 复习问题

1. 为什么 Postman 能调用没有 CORS 配置的 API，而浏览器前端不能读取响应？
2. 为什么 `credentials: true` 不能和允许来源 `*` 一起使用？
3. HttpOnly Cookie 无法被 JavaScript 读取时，前端如何判断用户是否登录？
