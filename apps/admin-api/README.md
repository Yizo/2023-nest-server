# admin-api

`admin-api` 是一个独立的 NestJS 后端脚手架，位于 `apps/admin-api`。它与仓库中的 `survey-statistics` 完全分开，不复用旧业务模块、旧 Query Builder 或旧的数据库结构。

## 当前范围

- NestJS 11.2.1 + TypeScript 6.0.3。
- PostgreSQL + MikroORM 7.1.13，只创建 ORM 实例和连接配置，不自动建表。
- Redis 基础连接和 `PING` 健康检查，不接入 BullMQ。
- `.env`、`.env.production`、`.env.local` 和系统环境变量配置，不使用 YAML。
- 使用 `dotenv-flow` 负责环境文件的层级加载和覆盖，应用代码只负责整理嵌套配置对象。
- development 优先级为：系统环境变量 > `apps/admin-api/.env.local` > `apps/admin-api/.env` > 代码默认值。
- production 优先级为：系统环境变量 > `apps/admin-api/.env.production` > `apps/admin-api/.env` > 代码默认值；production 不加载 `.env.local`。数据库配置为空时由 MikroORM/Redis 在运行时报告错误。
- 全局异常过滤器、响应拦截器、请求日志拦截器、ValidationPipe、Request ID 中间件和认证占位守卫。
- Winston 控制台日志和按级别每日滚动的本地文件日志。
- `live`/`ready` 健康检查和 Swagger 文档。

第一版不包含用户、登录、JWT、角色、权限、业务实体、消息队列、计划任务、数据库迁移和 Docker 编排。

## 本地启动

要求 Node.js 22.17 或更高版本、pnpm 10。

```bash
pnpm install
# 准备基础 .env；如果已有 production 配置，可从 .env.production 复制后再编辑。
cp apps/admin-api/.env.production apps/admin-api/.env
cp apps/admin-api/.env apps/admin-api/.env.local
pnpm --dir apps/admin-api ssh:tunnel
# 保持上面的隧道终端运行，再打开另一个终端执行：
pnpm --dir apps/admin-api start:dev
```

默认监听 `http://localhost:3004`。

本地开发时 PostgreSQL 和 Redis 在云服务器上，需要先建立 SSH 隧道；production 应用直接访问服务器本机的 127.0.0.1，不运行 SSH 隧道。隧道脚本只按 `.env` → `.env.local` 的顺序读取本地 SSH 配置：

```bash
pnpm --dir apps/admin-api ssh:tunnel
```

隧道配置项包括 SSH 主机、端口、用户名、私钥、PostgreSQL 本地/远程端口和 Redis 本地/远程端口；这些配置只放在 `.env.local`。production 文件只保存非机密应用配置，线上 DATABASE_URL/REDIS_URL 由 1Panel 或进程环境变量注入，不配置 SSH。`SSH_REMOTE_*_PORT` 填 1Panel 映射到云服务器主机的端口，不填容器内部端口。

应用配置使用隧道本地端口：

```env
DATABASE_URL=postgresql://admin_api:密码@127.0.0.1:15432/admin_api
REDIS_URL=redis://:密码@127.0.0.1:16379/0
```

SSH 隧道关闭后，本地应用和数据库客户端会失去连接；重新执行 SSH 命令即可恢复。数据库客户端同样填写 `127.0.0.1` 和隧道的本地端口，不填写云服务器公网 IP。

如果 SSH 私钥已经通过 `ssh-agent` 加载，可以把 `SSH_IDENTITY_FILE` 留空；如果没有加载私钥，则填写私钥的绝对路径或以 `~/` 开头的路径。脚本以前台方式运行，SSH 进程保持运行就表示隧道正在占用；确认没有报错后，在第二个终端启动 Nest 应用。

`start:dev` 使用项目自己的进程清理脚本启动 Nest watch。按 `Ctrl+C`、关闭终端或 IDE 发送终止信号时，脚本会先结束 watch 进程及其 Node 子进程，Nest 再执行 Redis、MikroORM 和 HTTP 服务的优雅关闭。

关闭云服务器防火墙中的数据库公网规则不会影响上述 SSH 隧道，但 1Panel/Docker 仍需保留数据库到服务器本机的端口映射。如果已经删除了 Docker 端口映射，应先在 1Panel 中确认服务器本机能够访问的实际目标端口，再修改 `-L` 命令右侧端口。

## HTTP 接口

```text
GET /api/v1/                 应用基础信息
GET /api/v1/health/live      进程存活检查，不访问外部依赖
GET /api/v1/health/ready     PostgreSQL 和 Redis 就绪检查
GET /api/v1/docs             Swagger UI（由 SWAGGER_ENABLED 控制）
```

成功响应统一为：

```json
{
  "code": 0,
  "message": "成功",
  "data": {},
  "requestId": "请求标识",
  "timestamp": "2026-08-21T00:00:00.000Z"
}
```

普通错误使用 HTTP 状态码作为 `code`，不按业务模块创建大量错误码。

PostgreSQL 连接串必须包含数据库名，例如：

```text
postgresql://用户:密码@127.0.0.1:15432/数据库名
```

## 日志文件

日志默认写入 `apps/admin-api/logs`，目录由 `LOG_DIR` 控制：

```text
logs/
├── info/
├── warn/
├── error/
└── exceptions/
```

开发和生产环境固定写入本地日志，自动化测试环境不落盘。日志按天轮转，单文件默认最大 20 MB，默认保留 14 天。日志不会执行脱敏，因此必须限制日志目录的操作系统访问权限。日志目录已加入忽略规则，不会提交到 Git。

## 数据库策略

第一版不安装 MikroORM Migration，也不启用 `synchronize` 或 `schema.update()`。应用启动只创建 ORM 实例，不要求数据库当时可用；`ready` 健康检查通过 `SELECT 1` 判断 PostgreSQL 是否真正可连接。

当前数据库备份和恢复由 1Panel 或 PostgreSQL 工具负责，例如：

```bash
pg_dump --format=custom --file=admin-api.dump "$DATABASE_URL"
pg_restore --clean --if-exists --dbname="$DATABASE_URL" admin-api.dump
```

请先确认目标数据库和备份文件，再执行恢复。数据库导出/恢复属于备份或环境复制，不等同于未来的增量 schema migration。真正开始设计业务表和字段版本后，应重新评估是否引入 MikroORM Migration。

## 开发检查

```bash
pnpm --dir apps/admin-api typecheck
pnpm --dir apps/admin-api build
pnpm --dir apps/admin-api test
RUN_E2E=true pnpm --dir apps/admin-api test:e2e
```

端到端测试需要先准备合法的 `.env` 或 `.env.local`。production 部署需要 `.env.production`，且不会加载 `.env.local`。设置 `RUN_E2E=true` 后，即使远程依赖暂时不可用，也会验证 `live=200` 和 `ready=503` 的降级响应；不设置时默认跳过，不会阻塞单元测试。

如果 IDE 被强制结束、系统直接发送 `SIGKILL`，或者旧进程已经被其他工具脱离为守护进程，应用无法捕获这些情况。此时先查找端口占用者：

```bash
lsof -nP -iTCP:3004 -sTCP:LISTEN
```

确认 PID 属于本项目后，再结束该 PID；不要直接杀掉不确定归属的进程。
