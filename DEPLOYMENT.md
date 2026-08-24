# admin-api 部署说明

当前仓库的部署主线是 `apps/admin-api`。PostgreSQL 和 Redis 由云服务器上的 1Panel/Docker 管理，应用本身使用 Node.js 进程运行；本阶段不在仓库内维护 Docker Compose 和数据库迁移。

## 构建和启动

```bash
pnpm install --frozen-lockfile
pnpm build
pnpm start
```

生产环境需要提供 `apps/admin-api/.env.production` 和系统环境变量。production 文件只保存非机密应用配置；DATABASE_URL/REDIS_URL、数据库账号密码和 Redis 密码必须通过 1Panel、systemd 或容器环境变量注入，地址使用 `127.0.0.1`。production 不使用 SSH 隧道，也不加载 `.env.local`。`.env.local` 只用于本地开发：

```text
NODE_ENV=production
PORT=3004
SWAGGER_ENABLED=false
LOG_LEVEL=info
LOG_DIR=logs

# 线上连接信息必须由 1Panel/systemd/容器环境变量注入，并且必须包含数据库名。
DATABASE_URL=postgresql://数据库用户:数据库密码@127.0.0.1:5432/数据库名
REDIS_URL=redis://:Redis密码@127.0.0.1:26739/0
```

## 云数据库连接

数据库端口不需要对公网防火墙开放。应用服务器或本地开发机通过 SSH 隧道连接云服务器主机上的 Docker 端口映射。

本地开发使用：

```bash
pnpm ssh:tunnel
```

本地开发的隧道配置写在 `.env.local`；production 不运行隧道脚本。production 连接说明见 [.env.production](</Users/yizuohua/Desktop/git/2023-nest-server/apps/admin-api/.env.production:1)。

## 健康检查

```bash
curl http://localhost:3004/api/v1/health/live
curl http://localhost:3004/api/v1/health/ready
```

- `live` 只检查 Node/Nest 进程是否存活。
- `ready` 检查 PostgreSQL 和 Redis 是否真正可连接。
- 依赖不可用时返回 HTTP 503，不会自动修改数据库结构。

## 日志

开发和生产环境的 Winston 日志写入应用本地目录：

```text
apps/admin-api/logs/info/
apps/admin-api/logs/warn/
apps/admin-api/logs/error/
apps/admin-api/logs/exceptions/
```

日志按天和文件大小轮转，日志不执行脱敏，应通过服务器文件权限保护日志目录。

## 数据库备份

数据库备份和恢复由 PostgreSQL 工具或 1Panel 负责：

```bash
pg_dump --format=custom --file=admin-api.dump "$DATABASE_URL"
pg_restore --clean --if-exists --dbname="$DATABASE_URL" admin-api.dump
```

备份恢复不等于增量数据库迁移。真正开始设计业务表和字段版本后，再单独引入并评估 MikroORM Migration。

## 旧目录说明

旧的 `survey-statistics` 和 `nest-admin` 目录暂时保留，但已经从 pnpm workspace、根目录 Nest CLI 和默认构建/启动/测试命令中移出；本次新架构不依赖它们。
