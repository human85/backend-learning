# Monorepo 与 pnpm Workspace

## 先区分五个概念

| 概念 | 在当前仓库中的含义 |
| --- | --- |
| Git 仓库 | 由根目录 `.git/` 管理的一整段版本历史 |
| Monorepo | 在同一个 Git 仓库中管理多个项目的组织策略 |
| Workspace | pnpm 发现、安装和运行多个 package 的机制 |
| Package | 具有 `package.json` 的依赖与脚本单元 |
| Application | 能独立启动和部署的程序，例如 Mini SaaS |

Monorepo 是仓库的组织方式；Workspace 是包管理器提供的工具。可以把 Monorepo 看成一栋楼，workspace package 是楼里的房间，`pnpm-workspace.yaml` 是房间清单，而 pnpm 是负责统一管理的物业系统。

## 当前仓库如何工作

根目录的 `pnpm-workspace.yaml` 使用 glob 发现项目：

```yaml
packages:
  - 'apps/*'
  - 'labs/*'
  - 'packages/*'
```

根 `package.json` 是编排 package，保存跨项目命令；`apps/mini-saas/package.json` 才声明 NestJS 依赖和应用脚本。`pnpm install` 从根目录安装整个 workspace，并用一份 `pnpm-lock.yaml` 锁定版本，但每个 package 仍只能依赖自己声明的包。

## 三类常用命令

```bash
# 整个 workspace 安装依赖
pnpm install

# 对所有包含该脚本的 package 执行命令
pnpm --recursive --if-present test

# 只操作 Mini SaaS
pnpm --filter @backend-learning/mini-saas test
```

根脚本可以把较长的 workspace 命令包装成 `pnpm test`。`--filter` 根据 package 名称选择目标，不是根据文件夹名称猜测。

## 常见误区

- Monorepo 不等于把所有代码编译成一个应用；各应用仍可独立运行和部署。
- 共用锁文件不等于所有项目自动拥有全部依赖；依赖必须声明在正确的 `package.json`。
- 共享代码不是 Monorepo 的前提。只有出现真实复用后才需要 `packages/`。
- Workspace 解决项目发现、依赖安装和命令执行，不替你决定服务边界或业务架构。

## 复习问题

1. 如果删除 `pnpm-workspace.yaml`，Git 仓库是否仍然是 Monorepo？pnpm 又会失去什么能力？
2. NestJS 依赖为什么应放在 Mini SaaS 的 `package.json`，而不是根目录？
3. `pnpm test` 与带 `--filter` 的测试命令在目标范围上有什么区别？

## 官方资料

- [pnpm Workspace](https://pnpm.io/workspaces)
- [NestJS Workspaces](https://docs.nestjs.com/cli/monorepo)
