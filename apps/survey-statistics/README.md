# Survey Statistics

这是 `survey-statistics` 的全新实现。它不兼容旧数据库和旧 API，也不依赖仓库中的 `@base/commons` Query Builder。

进一步阅读：

- [架构决策与学习指南](./docs/architecture.md)
- [数据库版本、发布与恢复流程](./docs/database-lifecycle.md)
- [代码阅读顺序](./docs/code-reading-guide.md)
- [项目目录树与职责说明](./docs/project-tree.md)
- [前端接口迁移说明](./docs/frontend-api-migration.md)
- [日志系统](./docs/logging.md)
- [错误码约定](./docs/error-codes.md)

## 架构边界

- NestJS 11 + MikroORM 7 + PostgreSQL 16。
- 角色完全由数据库动态管理，代码只检查权限码；系统不初始化 `super_admin/admin/user` 等固定角色。
- `isPlatformOwner` 只用于首个启动账号。平台所有者进入系统后创建实际角色并分配权限。
- 表之间不创建物理外键。所有关联 ID 都有索引，写入前检查引用，父数据使用软删除，并提供孤儿检查。
- 简单查询直接使用 MikroORM；复杂查询使用业务专用 Query 类或参数化 SQL，不存在通用 Query Builder 封装。
- 核心业务同步写 PostgreSQL。BullMQ 只处理通知、错误聚合、清理、补偿和完整性巡检。

## 本地启动

要求 Node.js 22.17 或更高版本、pnpm 10、Docker；生产镜像固定使用 Node.js 24。

```bash
cp apps/survey-statistics/.env.example apps/survey-statistics/docker/.env
cp apps/survey-statistics/.env.example apps/survey-statistics/.env
mkdir -p apps/survey-statistics/docker/secrets
openssl rand -base64 32 > apps/survey-statistics/docker/secrets/bootstrap-admin-password.txt

docker compose --env-file apps/survey-statistics/docker/.env \
  -f apps/survey-statistics/docker/docker-compose.yml up -d postgres redis

pnpm survey:db:status
pnpm survey:db:migrate
pnpm survey:bootstrap-admin
pnpm survey:queue:sync
pnpm survey:dev
```

从仓库根目录也可以运行 `pnpm survey:dev`。该命令会进入子应用并使用它自己的 Nest CLI 11 和 TypeScript 5.9，不会再走旧 monorepo 的 Nest CLI 9。

首次初始化也可以使用一条命令完成：

```bash
pnpm survey:init
```

它会按顺序执行数据库迁移、管理员引导和队列调度同步；后续升级时仍建议分别执行 `survey:db:migrate` 和 `survey:queue:sync`，便于查看每一步结果。

本地平台所有者默认用户名为 `superadmin`，也可以通过 `BOOTSTRAP_ADMIN_USERNAME` 修改；登录接口同时接受用户名或邮箱。

本地直接运行命令时，应用会读取 `apps/survey-statistics/.env`，开发环境可以通过 `BOOTSTRAP_ADMIN_PASSWORD` 完成管理员引导。首次启动前仍需显式执行数据库迁移、管理员引导和队列调度；生产环境会忽略明文密码变量，必须使用 `BOOTSTRAP_ADMIN_PASSWORD_FILE`。

API 前缀为 `/api/v1`，Swagger 默认位于 `/api/v1/docs`。

## 部署顺序

1. 构建同一个应用镜像。
2. 执行部署前 `pg_dump -Fc` 备份并验证 manifest/checksum。
3. 运行 `migrate` 一次性容器。
4. 首次部署运行 `bootstrap-admin`；以后重复执行不会创建第二个所有者。
5. 运行 `queue-schedule-sync` 一次性容器。
6. 启动 `PROCESS_ROLE=all` 的应用。
7. 验证 `/api/v1/health/ready`、登录、问卷提交和后台任务。

初期使用 `PROCESS_ROLE=all`。需要拆分时，将 API 设置为 `PROCESS_ROLE=api`，并启动同镜像的 `PROCESS_ROLE=worker` 容器。

## 数据库升级和恢复

- 应用启动不会自动执行迁移；有待执行迁移时 readiness 返回 503。
- `pnpm --filter survey-statistics db:backup` 生成 custom-format dump、manifest 和 SHA-256。
- `db-restore.sh` 会先验证 SHA-256 和 dump 目录，再检查目标数据库为空；它拒绝原地覆盖当前数据库。
- 基线迁移没有破坏性 `down`。发生破坏性迁移问题时，从验证过的备份恢复到新数据库，再切换 `DATABASE_URL`。
- `pnpm --filter survey-statistics db:orphan-check` 检查所有逻辑关联，只报告问题，不自动删除数据。

容器化部署时，使用工具 profile 执行备份：

```bash
docker compose --env-file apps/survey-statistics/docker/.env \
  -f apps/survey-statistics/docker/docker-compose.yml \
  --profile tools run --rm backup
```

恢复必须指向预先创建的全新空数据库，并同时保留 dump 旁的 `.sha256` 文件：

```bash
docker compose --env-file apps/survey-statistics/docker/.env \
  -f apps/survey-statistics/docker/docker-compose.yml \
  --profile tools run --rm restore \
  /backups/survey-statistics-YYYYMMDDTHHMMSSZ.dump \
  postgresql://user:password@postgres:5432/survey_statistics_restored
```

恢复成功后先在新数据库运行健康检查和关键业务冒烟测试，最后通过部署配置切换 `DATABASE_URL`。不要在旧数据库上执行覆盖恢复。

## 队列运维

- `pnpm --filter survey-statistics queue:failed` 查看最近失败任务。
- `pnpm --filter survey-statistics queue:retry-failed` 手动重试。
- Redis 必须启用 AOF、持久化卷和 `noeviction`。
- 通知与错误原始记录先写 PostgreSQL；Redis 丢失后由 reconcile 任务重新生成待处理任务。

## 错误响应

成功响应的 `code` 为 `0`。普通错误的 `code` 等于 HTTP 状态码；缺少 Token、Token 过期/无效等需要前端执行不同动作的认证状态使用 1001-1005。不会恢复按业务模块不断增长的大型错误码枚举。
