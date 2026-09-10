# Request ID 与最小请求日志

排错时需要从前端的一次失败找到对应的后端日志。当前实现链路：

`请求进入 → 生成 UUID 并设置响应头 → 解析/认证/Controller/Service → 响应完成 → JSON 日志`

- `X-Request-ID` 标识一次 HTTP 尝试，当前由服务端生成，不接受客户端覆盖；响应头也适用于没有响应体的 204。跨域 JavaScript 读取需要 CORS `exposedHeaders`。
- Session 用于恢复身份，同一用户可有多个 Session，每个 Session 又可承载多次请求；Session ID 是凭证，不能充当可公开的排错编号。
- Idempotency-Key 标识一次逻辑操作；重试保持幂等键不变，每次 HTTP 尝试拥有独立 Request ID。
- JSON 字段可按 `requestId` 精确关联，按 `statusCode` 筛选，按 `durationMs` 比较耗时；避免从自由文本反复提取这些值。
- 当前只记录路由模板，例如 `/projects/:id`；未匹配路由使用 `<unmatched>`。不记录原始 URL、查询参数、请求体、Cookie、Token 或原始异常文本。
- `finish` 时读取最终状态码；在调用 `next()` 前读取无法代表后续请求结果。回调闭包保留本次编号，避免并发请求共用可变变量。

当前边界：这是请求完成日志，没有 Service 内部上下文、错误原因分类和客户端断连记录。请求编号能关联失败，但不保证仅靠现有日志定位数据库故障根因；响应写出也不证明客户端已收到或数据库业务一定正确。

代码：[`request-logging.ts`](../../apps/mini-saas/src/observability/request-logging.ts)。异常处理扩展方式参考 [NestJS 官方异常过滤器文档](https://docs.nestjs.com/exception-filters)。实现先有本地证据，随后在 Render `19da815` 部署版本的公网 smoke 中按 Request ID 核对到对应日志。
