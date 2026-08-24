# admin-api backend workspace

当前仓库的新主应用是 `apps/admin-api`，采用独立的 NestJS 11、PostgreSQL、MikroORM、Redis、Winston 和分层环境配置。pnpm workspace 只管理 `apps/admin-api` 和未来的公共 `packages`，不会自动安装旧应用。

旧的 `survey-statistics` 源码暂时保留用于历史参考，但不再参与根目录默认的构建、启动和测试流程。

## 环境要求

- Node.js 22.17 或更高版本。
- pnpm 10。
- PostgreSQL 和 Redis；本地开发可以通过 SSH 隧道连接云服务器上的 1Panel/Docker 服务。

## 第一次启动

```bash
pnpm install
# 如果已有 production 基础配置，可以复制后再填写本机覆盖值。
cp apps/admin-api/.env.production apps/admin-api/.env
cp apps/admin-api/.env apps/admin-api/.env.local
```

将基础配置放在 `apps/admin-api/.env`，production 配置放在 `.env.production`；production 只保存非机密应用配置，线上 DATABASE_URL/REDIS_URL、账号和密码全部通过系统环境变量提供，地址使用 `127.0.0.1`，不配置 SSH。真实公网地址、SSH 主机和本机数据库连接信息只放在 `.env.local`。development 优先级为：系统环境变量 > `.env.local` > `.env`；production 优先级为：系统环境变量 > `.env.production` > `.env`。

第一个终端建立隧道：

```bash
pnpm ssh:tunnel
```

第二个终端启动开发服务：

```bash
pnpm start:dev
```

也可以直接使用应用目录命令：

```bash
pnpm --dir apps/admin-api ssh:tunnel
pnpm --dir apps/admin-api start:dev
```

## 根目录命令

根目录命令都只代理到 `admin-api`：

```bash
pnpm build
pnpm start
pnpm start:dev
pnpm ssh:tunnel
pnpm typecheck
pnpm test
pnpm test:e2e
```

## HTTP 地址

默认端口为 `3004`：

```text
GET http://localhost:3004/api/v1/
GET http://localhost:3004/api/v1/health/live
GET http://localhost:3004/api/v1/health/ready
GET http://localhost:3004/api/v1/docs
```

## 目录边界

- `apps/admin-api`：当前唯一的主应用和新架构实现。
- `apps/admin-api/src/common`：全局过滤器、拦截器、管道、中间件和守卫。
- `apps/admin-api/src/database`：MikroORM PostgreSQL 连接和请求上下文。
- `apps/admin-api/src/infrastructure/redis`：Redis 连接生命周期和健康检查。
- `apps/admin-api/scripts`：SSH 隧道和开发进程清理脚本。
- `apps/admin-api/test`：单元测试和 HTTP 端到端测试。
- `apps/survey-statistics`、`apps/nest-admin`、`packages`：历史代码或待重新评估的旧目录，不属于当前默认启动链路。

## 当前阶段不包含

当前脚手架暂不包含用户登录、角色权限、业务实体、消息队列、计划任务、数据库迁移和 Docker 编排。production 应用由云服务器上的 1Panel 管理并直接访问 127.0.0.1；本地开发通过 `.env.local` 和 SSH 隧道访问。

详细说明请阅读 [apps/admin-api/README.md](</Users/yizuohua/Desktop/git/2023-nest-server/apps/admin-api/README.md:1) 和 [项目目录说明](</Users/yizuohua/Desktop/git/2023-nest-server/apps/admin-api/docs/project-tree.md:1)。
