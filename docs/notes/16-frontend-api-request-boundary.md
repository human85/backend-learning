# 前端 API 请求边界

## 为什么需要统一请求函数

浏览器中的每个业务请求都需要相同的基础规则：API 地址、Session Cookie、HTTP 错误解析和空响应处理。如果页面各自直接调用 fetch，任何一处遗漏 `credentials: 'include'` 都会让已登录用户表现成未登录。

统一的 `apiRequest` 类似配置好的 Axios instance，但当前使用原生 fetch，以便直接观察 HTTP 行为并减少依赖。

## Fetch 的三类结果

1. `2xx`：Promise resolve，`response.ok` 为 true。
2. `4xx` 或 `5xx`：Promise 仍然 resolve，但 `response.ok` 为 false，需要代码主动抛出 ApiError。
3. 断网、API 未启动或 CORS 拦截：Promise reject，前端没有可读取的 Response 和状态码。

## 当前请求顺序

```text
apiRequest(path, init)
  → 合并调用方的 method、headers、body
  → 最后强制 credentials: include
  → fetch 请求
  → 非 2xx：解析后端错误并抛出 ApiError
  → 204：直接返回 undefined
  → 其他 2xx：解析并返回 JSON
```

`credentials` 放在 `...init` 后面，避免调用方意外覆盖统一认证策略。

## 运行时数据仍不可信

`response.json()` 的 TypeScript 返回类型不能证明服务器一定返回预期结构。当前实现先把它视为 unknown，再检查错误对象是否真的包含字符串或字符串数组 message。这与后端 DTO 的原则相同：静态类型不能替代运行时边界检查。

## 认证 API 与登录状态分层

auth API 模块只描述 HTTP 合同：

- register 创建用户，但当前后端不会创建 Session。
- login 校验密码并通过响应 Set-Cookie 建立 Session。
- getCurrentUser 使用浏览器自动携带的 Cookie 调用 `/auth/me`。
- logout 销毁服务端 Session，并返回 204 空响应。

这些函数不保存 React 状态。TanStack Query 在应用启动时调用 getCurrentUser：`401` 被转换为 `null`，表示已确认未登录；用户对象表示已登录；Query pending 表示仍在检查；其他异常保留为错误界面。

## 为什么不在组件里手写请求状态

认证与 Projects 都属于服务端状态：它们有加载、错误、缓存、失效、重试和多个组件共享等共同问题。每个页面自己组合 useEffect、isLoading、error 和 user 会重复造轮子，也容易产生状态不同步。

当前边界是：

- apiRequest 处理 HTTP 传输规则。
- auth.api 描述 endpoint 合同。
- TanStack Query 管理服务端数据生命周期和缓存。
- React useState 只管理邮箱、密码、标签页等纯界面状态。

登录成功后把用户写入 `['auth', 'current-user']` 缓存；注销成功后把它改为 `null`。刷新页面会重建内存缓存，因此仍需重新请求 `/auth/me`，由服务端 Session 恢复身份。

## 复习问题

1. 为什么 API 返回 401 时 fetch 不会自动进入 catch？
2. 为什么 204 必须在调用 `response.json()` 前处理？
3. 为什么 credentials 必须放在对象展开之后？
4. CORS 失败时为什么不能读取 response.status？
