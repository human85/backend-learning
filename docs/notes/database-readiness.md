# 数据库 Readiness 的边界

`GET /health` 返回固定内容，只说明这条 HTTP 路径可响应。`GET /ready` 经专用连接执行 SELECT 1，成功返回 200，连接失败或查询超时返回 503。

链路：HTTP → ReadinessController → 共享一次在途探测 → 获取连接 → SELECT 1 → 释放或销毁连接 → 响应与请求完成日志。

- Promise.race 不会自动取消落败任务。当前使用驱动连接等待上限 1000ms、PostgreSQL statement_timeout 500ms、客户端 query_timeout 750ms；连接和查询两阶段的等待预算合计约 1750ms，另有事件循环调度开销。
- 成功时 release(false) 把健康连接还回池；失败时 release(true) 从池中销毁连接，避免将仍在执行或已断开的客户端复用。服务端语句超时限制后台执行，不能把客户端超时本身称为 SQL 取消。
- max=1 限制本进程探测池的连接数；共享在途 Promise 避免并发健康检查排成长队。不同进程各有自己的池，这不是全局限流。
- /ready 的响应禁止缓存；失败完成日志记录 Request ID 和固定 database_probe_failed 分类，不记录原始错误和凭证。它可定位依赖探测失败，不能区分具体网络或认证根因。
- 专用探测池能执行 SELECT 1，不证明业务连接池可用、migration 已完成、写权限存在或业务逻辑正确。应用启动仍依赖 TypeORM 成功连接；这次实现没有承诺数据库离线时应用仍可启动。

真实验证：测试专属 TCP 代理模拟握手无响应和已建立连接的响应中断；恢复后可继续探测。PostgreSQL pg_sleep 验证服务端取消慢语句。此为本地证据，尚未重新部署或接入平台 Readiness 调度。

实现见 [readiness.service.ts](../../apps/mini-saas/src/readiness/readiness.service.ts)。驱动配置与销毁语义参考 [node-postgres Client](https://node-postgres.com/apis/client) 和 [Pool](https://node-postgres.com/apis/pool)。
