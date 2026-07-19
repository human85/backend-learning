# Service 内存状态与实例生命周期

## 状态保存在哪里

ProjectsService 使用实例属性临时保存项目：

```ts
private readonly projects: Project[] = [];
private nextId = 1;
```

Nest Provider 默认是单例。同一个 Nest 应用中的多次请求通常获得同一个 ProjectsService 实例，因此创建请求写入的数组能够被后续列表请求读取。

```text
一个应用实例
  → 一个 ProjectsService
  → 一个 projects 数组
  → 多个 HTTP 请求共享
```

## 为什么测试状态会重置

Service 单元测试在每个测试前执行 `new ProjectsService()`；当前 e2e 也在 `beforeEach` 中创建一个新 Nest 应用。新实例拥有新的空数组和从 1 开始的 ID，因此不同测试不会共享数据。

测试隔离可以避免执行顺序影响结果。如果创建和查询被拆成两个各自启动应用的 e2e 测试，查询测试会得到空数组。

## 为什么返回数组副本

```ts
findAll(): Project[] {
  return [...this.projects];
}
```

返回新数组可以防止调用者通过 `push()`、`pop()` 等操作直接改变 Service 的内部数组。它是浅拷贝，数组中的 Project 对象仍然共享引用；更完整的不可变设计以后再讨论。

## 为什么这不是持久化

内存状态只存在于当前 JavaScript 进程：

- 应用重启后数据消失。
- 多个服务实例各自拥有不同数组。
- 没有事务、约束、备份或可靠查询能力。

它适合用来理解 CRUD 和 Service 生命周期，但生产数据最终需要保存到数据库。
