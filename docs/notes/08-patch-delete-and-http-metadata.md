# PATCH、DELETE 与 HTTP 元数据

## PATCH 的更新边界

PATCH 表示修改资源的一部分，而不是用请求体替换完整资源。当前 Project 只有 `name` 可修改，`id` 由服务端生成，因此 UpdateProjectDto 不允许客户端提交 ID。

```text
PATCH /projects/1
  → ParseIntPipe 校验 ID
  → UpdateProjectDto 校验名称
  → Service 查找并更新
  → 200 + 更新后的 Project
```

Service 根据原项目创建新对象并只覆盖允许的字段，避免把外部请求体直接合并到内部数据。

## DELETE 与 204

删除不存在的项目返回 `404`，因为没有资源真正被删除。成功删除使用 `204 No Content`，响应体必须为空。

```ts
@Delete(':id')
@HttpCode(HttpStatus.NO_CONTENT)
deleteProject(...): void {}
```

Service 负责删除规则，Controller 负责 HTTP 成功状态码。若删除 `@HttpCode()`，NestJS 会使用普通成功响应的默认状态码，而不是自动推断 `204`。

## 为什么单元测试看不到状态码错误

Controller 单元测试直接调用 `deleteProject(1)`，不会启动 NestJS HTTP 管道，也不会读取方法上的 `@HttpCode()` 元数据。Service 单元测试更不涉及 HTTP。

因此删除 `@HttpCode(204)` 后，两个单元测试仍可能通过，只有发送真实 DELETE 请求的 e2e 能发现实际状态码变为 `200`。
