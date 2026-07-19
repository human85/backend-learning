# 路径参数、Pipe 与 404

## 路径参数首先是字符串

HTTP URL 不携带 TypeScript 类型。请求 `GET /projects/1` 中的 `id` 在运行时首先是字符串 `"1"`，仅仅标注 `id: number` 不会执行转换。

```ts
@Get(':id')
getProject(@Param('id', ParseIntPipe) id: number): Project {
  return this.projectsService.findOne(id);
}
```

ParseIntPipe 在 Controller 方法之前运行：能够转换时传入数字，不能转换时直接返回 `400 Bad Request`，Controller 与 Service 都不会执行。

## 400 与 404 的区别

```text
/projects/abc
  → id 不是有效整数
  → 400 Bad Request

/projects/999
  → 999 是有效整数
  → Service 查询不到资源
  → 404 Not Found
```

当前 Service 直接抛出 NestJS 的 NotFoundException。这种方式适合当前学习阶段；更严格的领域分层可以让 Service 抛领域错误，再由 HTTP 层统一映射状态码。

## 为什么单元测试可能全部通过

Controller 单元测试直接调用 `getProject(1)`，Service 单元测试直接调用 `findOne(1)`，两者都已经传入真正的数字并绕过 HTTP 路径参数。

如果删除 ParseIntPipe，运行时会比较：

```ts
1 === '1' // false
```

单元测试仍可能通过，但真实 `GET /projects/1` 会错误地得到 `404`。e2e 从 HTTP 请求开始，才能验证 Pipe、Controller 和 Service 的组合行为。
