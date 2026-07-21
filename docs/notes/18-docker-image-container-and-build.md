# Docker Image、Container 与多阶段构建

## 为什么需要 Docker

后端应用不仅依赖源码，还依赖 Node.js、生产依赖、系统库、环境变量和外部服务。Dockerfile 把运行环境写成可重复构建的配置，减少“本机能运行但服务器不能运行”的差异。

Docker 不会自动解决代码错误、数据库 migration、密钥管理、备份或 HTTPS；它解决的是应用运行环境如何被打包和交付。

## 核心概念

```text
Dockerfile --build--> Image --run--> Container
```

- Dockerfile 是制作 Image 的说明。
- Image 是只读模板，同一 Image 可以创建多个 Container。
- Container 是正在运行或已经停止的实例。
- Volume 独立保存持久化数据，生命周期不应跟随 PostgreSQL Container。
- Compose 描述多个 Container 如何一起运行、联网和挂载 Volume。

关闭 Docker Desktop 窗口不会停止 Engine；退出 Docker Desktop 会停止 Mac 上的 Linux Engine 和运行中的 Container，但不会自动删除 Image 与 Volume。

## 当前 API Image

Mini SaaS 使用多阶段 Dockerfile：

1. `base` 提供 Node.js 和 pnpm。
2. `build` 安装完整依赖、编译 TypeScript，并用 `pnpm deploy --prod` 生成可移植生产目录。
3. `runtime` 只复制编译结果与生产依赖，使用非 root 的 `node` 用户运行。

构建阶段需要 TypeScript 和 Nest CLI；运行阶段不需要这些构建工具，但仍需要 NestJS、TypeORM、PostgreSQL 驱动、Argon2 和 Joi。

`.dockerignore` 防止本机 `node_modules`、`dist`、Git 历史、环境密钥和无关前端代码进入构建上下文。

## 构建缓存

先复制 package manifest 和锁文件，再安装依赖，最后复制源码。只有依赖声明变化时才需要重新安装依赖；普通源码变化可以复用昂贵的依赖层。

## 复习问题

1. 修改本地源码后，已经构建的 Image 为什么不会自动变化？
2. 为什么 Runtime Image 仍需要 production dependencies？
3. 关闭 Docker Desktop 窗口与退出 Docker Desktop 有什么区别？
4. 为什么数据库数据应该放在 Volume，而不是只留在 Container 内部？
