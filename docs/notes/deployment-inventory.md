# Mini SaaS 部署清单

> 这份清单记录可公开的部署定位信息，不记录密码、连接串、Session Secret 或其他密钥。状态和 commit 会变化；每次 smoke test 前都要重新核对 Render 控制台。

## 当前已核实信息

核对日期：2026-09-10（Asia/Shanghai）

| 项目                       | 记录                                                                       |
| -------------------------- | -------------------------------------------------------------------------- |
| 代码仓库                   | `github.com/human85/backend-learning`                                      |
| 部署平台                   | Render                                                                     |
| 环境                       | `Production`，项目 `My project`                                            |
| API 服务                   | `backend-learning-mini-sass-api`（Service ID：`srv-d9fjsk1kh4rs73ckisjg`） |
| API 地址                   | `https://backend-learning-mini-sass-api.onrender.com`                      |
| 前端服务                   | `backend-learning-mini-saas-web`（Service ID：`srv-d9fk44f41pts73ecmnng`） |
| 前端地址                   | `https://backend-learning-mini-saas-web.onrender.com`                      |
| 分支                       | `main`                                                                     |
| 当前线上 commit            | `d76f053`（本次仅为文档变更）                                              |
| 本轮业务 smoke 目标 commit | `19da815`                                                                  |

服务名中的拼写必须逐字符核对：API 使用 `sass`，前端使用 `saas`。不要把两个地址互换，也不要把相近但不存在的主机名当成 API。

## 请求入口关系

```text
浏览器
  -> https://backend-learning-mini-saas-web.onrender.com/api/*
  -> Render Static Site Rewrite
  -> https://backend-learning-mini-sass-api.onrender.com/*
```

静态站点还配置了 `/*` 到 `/index.html` 的前端路由回退。前端构建配置键为 `VITE_API_BASE_URL`，生产请求使用相对 `/api`；具体配置值不复制到日志或代码记录，通过 `/api/health` 的公网响应和 Render Rewrite 设置核对其生效结果。

## 配置来源

- Render Production 保存 `NODE_ENV`、`DATABASE_URL`、`SESSION_SECRET` 和 `FRONTEND_ORIGIN`。文档只记录键名，不记录值。
- 前端的 `VITE_API_BASE_URL` 是构建时公开配置，不承担密钥职责；本地未配置时由代码回退到 `http://localhost:3000`。
- 本地生产数据库核对使用被 Git 忽略的 `apps/mini-saas/.env.production.local`；该文件和连接串不提交、不复制到此清单。
- 数据库服务为 Neon PostgreSQL。数据库主机、用户名、密码和连接串不写入学习档案。

## 部署后最小核对

当前部署切换后已核对：

- API `/health` 返回 `200` 和 `{ "status": "ok" }`。
- API `/ready` 返回 `200`，且响应带 `Cache-Control: no-store`。
- 前端根路径返回 `200`。
- 前端 `/api/health` 返回 `200`，证明静态站点 Rewrite 到 API 的路径可用。
- 响应中的 `X-Request-ID` 可以在 Render API 日志中关联到 `method`、`route`、`statusCode`、`durationMs` 和 `timestamp`。

完整业务 smoke 另有记录，使用唯一临时数据并按项目 → Session → 用户顺序清理；HTTP 状态码不能替代数据库最终状态查询。

## 使用边界

- Render 控制台的 Live 和健康探测只能证明某个部署实例可启动和响应，不能单独证明登录、权限、项目归属或数据清理正确。
- Render Free 服务空闲后可能休眠，首次请求会有冷启动延迟。
- 缺少目标地址、环境、commit 或代理拓扑时，不能把线上请求结果归因于当前改动。
