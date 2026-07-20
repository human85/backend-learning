# 环境变量校验与 Fail Fast

## 它解决什么问题

数据库地址、Session 密钥和允许的前端来源都来自应用外部。TypeScript 只能检查源码中的类型，不能保证服务器启动时真的提供了这些值，也不能保证字符串内容合法。

如果等到第一次请求才发现配置错误，服务可能已经被部署并显示为“正在运行”，故障却只在用户访问某条路径时暴露。Fail Fast 的目标是在启动阶段一次性发现错误配置，让进程明确失败。

## 在当前项目中的位置

`src/config/environment.validation.ts` 使用 Joi 描述运行环境契约，`AppModule` 把 schema 交给全局 ConfigModule：

- `NODE_ENV` 只能是 development、test 或 production。
- `DATABASE_URL` 必须是 PostgreSQL URL。
- `SESSION_SECRET` 必须存在且至少 32 字符。
- `FRONTEND_ORIGIN` 必须是 HTTP(S) URL。

ConfigModule 先读取环境变量与 `.env`，再执行 schema 校验。成功后，TypeORM、SessionMiddleware 和 CORS 才从 ConfigService 读取值。

## 与 DTO 校验的区别

- DTO 校验保护每一次 HTTP 请求的外部输入，失败通常返回 `400`。
- 环境校验保护整个应用进程的启动输入，失败时应用不应监听端口。
- 两者都是运行时校验，但处于不同边界，不能相互替代。

## 能运行与长期安全

最小长度只能拦截明显过短的 Session Secret，不能证明它真的随机。生产密钥仍应由密码管理工具生成和保存，不能提交到 Git。`.env.example` 只描述变量名称与格式，不保存真实密钥。

## 复习问题

1. 为什么给 `process.env.SESSION_SECRET` 写 TypeScript 类型不能替代 Joi？
2. 如果生产环境漏掉 `FRONTEND_ORIGIN`，`GET /health` 是否会先短暂可用？
3. DTO 校验失败与环境校验失败分别发生在请求链路的哪个阶段？
