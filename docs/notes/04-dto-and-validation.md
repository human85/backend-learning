# DTO 与运行时校验

## 为什么 TypeScript 类型不够

TypeScript 只在开发和编译阶段检查代码。外部客户端可以绕过前端发送任意 JSON，因此后端不能把类型标注当成运行时安全边界。

```text
HTTP JSON
  → ValidationPipe
  → DTO 校验
  → 校验成功才进入 Controller
```

## DTO 与 ValidationPipe 的分工

DTO class 使用 `class-validator` 装饰器声明规则：

```ts
export class CreateProjectDto {
  @IsString()
  @IsNotEmpty()
  name!: string;
}
```

DTO 描述规则，ValidationPipe 负责执行规则。校验失败时，Pipe 在 Controller 之前抛出异常，NestJS 将其转换为 `400 Bad Request`。

## 白名单配置

```ts
new ValidationPipe({
  whitelist: true,
  forbidNonWhitelisted: true,
});
```

- `whitelist` 会移除 DTO 未声明的字段。
- `forbidNonWhitelisted` 会将额外字段视为错误并返回 `400`，而不是清理后继续。

例如客户端传入 `isAdmin` 时，当前应用会明确拒绝请求，避免未知或敏感字段被误处理。

## 为什么共享应用配置

生产应用由 `main.ts` 创建，e2e 测试则直接从 AppModule 创建另一个 Nest 应用，不会自动执行 `main.ts`。因此全局管道由 `configureApp()` 统一注册，并由两个启动入口共同调用，避免测试环境与真实环境漂移。

## 当前接口边界

`POST /projects` 目前只验证并回显名称：

```text
合法输入 → 201 + 项目名称
类型错误 → 400
空字符串 → 400
额外字段 → 400
```

它还没有生成 ID，也没有保存到数据库，不能称为完整的项目创建功能。
