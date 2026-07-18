# 依赖注入与测试边界

## 为什么不在 Controller 中创建 Service

Controller 通过构造函数声明自己需要 `AppService`，但不负责 `new AppService()`。NestJS 容器根据 Module 注册信息创建并注入依赖，因此 Controller 不需要知道 Service 的创建方式和其他依赖。

```text
AppModule 注册 AppService
  → NestJS 创建 AppController
  → 将 AppService 注入构造函数
```

## 测试如何替换依赖

Controller 单元测试可以用 `useValue` 替换真实 Service：

```ts
{
  provide: AppService,
  useValue: appServiceMock,
}
```

`provide` 是 Controller 请求的依赖标识，`useValue` 是测试实际注入的对象。这样可以只检查 Controller 是否正确委托，而不执行真实 Service。

## 三种测试视角

| 测试 | 使用的依赖 | 主要验证 | 看不到什么 |
| --- | --- | --- | --- |
| Controller 单元测试 | mock Service | Controller 的委托和返回 | 真实 Service、HTTP 路由 |
| Service 单元测试 | 真实 Service | 业务方法的实际规则 | Controller 和 HTTP |
| e2e 测试 | 真实应用 | 路由、注入、序列化和响应 | 通常不精确定位内部故障层 |

mock 让测试更快、更聚焦，但它可能与真实实现不一致。因此不能因为 Controller 的 mock 测试通过，就断定完整接口一定正确。

## 当前例子

`GET /health` 的完整链路是：

```text
GET /health
  → AppController.getHealth()
  → AppService.getHealth()
  → { status: 'ok' }
  → 200 JSON 响应
```

如果真实 Service 改为返回 `down`，而 mock 仍返回 `ok`，Controller 单元测试仍可能通过；Service 单元测试和期待 `ok` 的 e2e 测试会失败。
