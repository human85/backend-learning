# 后端请求链路

## 解决什么问题

一次 HTTP 请求需要经过明确分工的层次，才能把协议处理、业务规则和数据存取分开，避免所有逻辑堆在同一个入口中。

```text
浏览器 → Controller → Service → Repository/ORM → Database
                                                ↓
浏览器 ← Controller ← Service ← Repository/ORM ←
```

## 各层职责

- **Controller**：接收请求、读取并验证输入、调用 Service、返回响应。
- **Service**：执行“能不能做、应该怎么做”等业务规则。
- **Repository/ORM**：查询和保存数据，不决定业务是否允许。
- **Database**：长期保存数据，并通过约束、索引和事务保护数据正确性。

前端类比只能帮助入门：Controller 类似路由入口，Service 类似承载业务的 Hook，Repository 类似 API client；但后端还必须处理权限、并发、事务和持久化，不能完全套用前端模型。

## 已使用的例子

创建项目时，Controller 获取当前用户和项目名称；Service 检查用户是否存在、免费套餐是否已达到三个项目；Repository 统计并写入项目；数据库最终保存结果。即使前端隐藏创建按钮，Service 仍必须执行规则，因为请求可以绕过前端直接发出。

## 复习问题

1. 为什么不能只在前端校验项目数量？
2. “免费用户最多创建三个项目”应放在哪一层？
3. Repository 为什么不应该决定用户能否创建项目？
4. 当前 NestJS 模板中的 `AppController` 和 `AppService` 分别位于链路哪里？
