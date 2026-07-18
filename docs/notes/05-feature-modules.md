# NestJS Feature Module

## 为什么按 Feature 拆分

如果用户、项目、订单和认证逻辑都堆在根 AppController 与 AppService 中，文件会同时承担多个领域职责，修改范围和依赖关系会越来越难判断。Feature module 将同一业务领域的入口、服务、DTO 和测试放在一起。

```text
projects/
├── dto/
├── projects.module.ts
├── projects.controller.ts
├── projects.service.ts
└── 对应测试
```

文件夹负责代码组织，`@Module()` 才负责向 NestJS 注册依赖关系。

## ProjectsModule 的注册信息

```ts
@Module({
  controllers: [ProjectsController],
  providers: [ProjectsService],
})
export class ProjectsModule {}
```

- `controllers` 注册当前 feature 的 HTTP 入口。
- `providers` 注册可由 NestJS 创建和注入的依赖。
- `exports` 只在其他模块也需要注入某个 provider 时使用，当前不需要导出 ProjectsService。

根 AppModule 通过 `imports: [ProjectsModule]` 将整个 feature 纳入应用。如果省略 import，项目文件仍存在，但真实应用不会注册对应路由。

## 路由前缀组合

```ts
@Controller('projects')
export class ProjectsController {
  @Post()
  createProject() {}
}
```

Controller 前缀与方法装饰器组合成 `POST /projects`。后续同一 Controller 可以继续承载 `GET /projects`、`GET /projects/:id` 等项目领域入口。

## 测试边界提醒

Controller 单元测试会自行构造 TestingModule，因此即使真实 AppModule 忘记导入 ProjectsModule，单元测试仍可能通过。e2e 通过真实 AppModule 启动应用，才能发现模块未挂载导致的 `404`。
