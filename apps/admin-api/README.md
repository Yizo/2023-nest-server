# admin-api

`admin-api` 是一个独立的 NestJS 后端，位于 `apps/admin-api`。它与仓库中的 `survey-statistics` 完全分开，不复用旧业务模块、旧 Query Builder 或旧的数据库结构。

## 当前范围

- NestJS 11.2.1 + TypeScript 6.0.3。
- PostgreSQL + MikroORM 7.1.13，通过 `@mikro-orm/nestjs` 注入；启动不自动建表或改表。
- 结构变化使用官方 MikroORM CLI 生成并执行 Migration；HTTP 进程不跑 migration。
- Redis 使用 `redis` 客户端做基础连接和 `PING`，不接入 BullMQ。
- 应用启动前会探测 PostgreSQL 和 Redis，任一未就绪则进程退出，避免半就绪服务进入反向代理。
- `.env`、`.env.production`、`.env.local` 和系统环境变量配置，不使用 YAML。
- `dotenv-flow` 负责环境文件层级；应用代码只整理嵌套配置对象。
- development 优先级：系统环境变量 > `apps/admin-api/.env.local` > `apps/admin-api/.env` > 代码默认值。
- production 优先级：系统环境变量 > `apps/admin-api/.env.production` > `apps/admin-api/.env` > 代码默认值；production 不加载 `.env.local`。`DATABASE_URL` / `REDIS_URL` 为空时由运行时或启动检查报错。
- 全局异常过滤器、响应拦截器、请求日志、ValidationPipe、Request ID 中间件和认证占位守卫。
- Winston 控制台日志和按级别每日滚动的本地文件日志。
- `live` / `ready` 健康检查和 Swagger 文档。

## 本地启动

在仓库根目录执行。Node.js ≥ 22.17，pnpm 10。先在 `apps/admin-api/.env.local` 配好 `DATABASE_URL`、`REDIS_URL` 和 SSH。

1. `pnpm install`
2. 一个终端：`pnpm ssh:tunnel`
3. 另一个终端：`pnpm start:dev`

默认 `http://localhost:3004`。库或 Redis 连不上时进程会退出。

## HTTP 接口

```text
GET /api/v1/                 应用名称、版本、环境
GET /api/v1/health/live      进程存活，不访问外部依赖
GET /api/v1/health/ready     PostgreSQL 和 Redis 就绪检查
GET /api/v1/docs             Swagger UI（SWAGGER_ENABLED 控制）
```

成功响应：

```json
{
	"code": 0,
	"message": "成功",
	"data": {},
	"requestId": "请求标识",
	"timestamp": "2026-08-21T00:00:00.000Z"
}
```

普通错误使用 HTTP 状态码作为 `code`，不按业务模块堆错误码。

## 数据库迁移

HTTP 启动不会改表。先改实体并写入 MikroORM `entities`，隧道保持连接。

本地：

1. `pnpm db:migration:create`
2. 审查 `apps/admin-api/src/infrastructure/database/migrations/Migration*.ts`
3. `pnpm db:migration:up`

可选：`pnpm db:migration:status` 看待执行，`pnpm db:migration:check` 核对实体与库是否一致。

生产（先发布 `dist`，再升库，最后起服务）：

1. `pnpm db:migration:up:prod`
2. `pnpm start`

## 日志文件

日志默认写入 `apps/admin-api/logs`，由 `LOG_DIR` 控制：

```text
logs/
├── info/
├── warn/
├── error/
└── exceptions/
```

开发和生产写入本地文件，测试环境不落盘。按天轮转，单文件默认最大 20 MB；保留天数由 `LOG_MAX_FILES` 控制（`.env` 为 20 天，`.env.production` 为 90 天）。日志不脱敏，需限制目录权限。该目录已加入 Git 忽略。

## 开发检查

```bash
pnpm --dir apps/admin-api typecheck
pnpm --dir apps/admin-api build
pnpm --dir apps/admin-api test
pnpm --dir apps/admin-api test:e2e
```

端到端测试会 mock 基础设施启动检查和健康检查，不要求当时连上远程库。生产部署需要 `.env.production`，且不会加载 `.env.local`。

若 IDE 被强制结束、收到 `SIGKILL`，或旧进程已变成守护进程，应用无法自行清理。先查端口占用：

```bash
lsof -nP -iTCP:3004 -sTCP:LISTEN
```

确认 PID 属于本项目后再结束；不要杀归属不明的进程。
