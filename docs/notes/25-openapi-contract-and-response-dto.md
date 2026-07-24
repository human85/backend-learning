# OpenAPI 契约与公开响应 DTO

## 为什么需要

Controller 和 DTO 是后端实现，但前端、测试和 AI 还需要一份机器可读的接口合同。OpenAPI 描述路径、输入、响应、状态码和认证方式；Swagger UI 只是这份合同的可视化界面。

## 描述不等于执行

- `@ApiProperty()`、`@ApiResponse()` 和 `@ApiCookieAuth()` 只影响 OpenAPI。
- ValidationPipe、class-validator、Guard 和 Service 才决定真实请求结果。
- 删除 Swagger 认证标注不会关闭 Guard；删除 Guard 也不会因为 Swagger 标注而继续受到保护。

## Entity 不应直接充当公开响应

Entity 表达数据库持久化结构，可能包含密码哈希、内部关系和运维字段。`select: false` 只控制 TypeORM 默认查询，不限制显式查询或 JSON 序列化。

公开 Response DTO 应采用字段白名单：例如 PublicUserDto 只包含 `id`、`email` 和 `createdAt`。Entity 后续增加字段时，API 契约不会自动扩张。

## 契约也需要测试

OpenAPI 装饰器可能与运行时代码漂移。当前 e2e 至少固定以下安全边界：

- PublicUserDto schema 不存在 `password` 和 `passwordHash`。
- Cookie Session 安全方案已经注册。
- 受保护的 Projects 操作引用同一个安全方案名称。

契约测试不能替代业务 e2e：前者证明文档正确，后者证明真实行为正确。
