# admin-api

`admin-api` 是独立的 NestJS 11 后端，使用 PostgreSQL、MikroORM 7、官方 `@mikro-orm/nestjs` 和 Redis 官方 Node.js 客户端。

## 环境要求

- Node.js ≥ 22.17。
- pnpm 10。
- PostgreSQL。
- Redis。
- 本地连接远程服务时可使用项目 SSH 隧道脚本。

## Development：自动同步模式

适合快速修改实体和个人开发数据库。

在 `.env.local` 中配置：

```env
DATABASE_URL=postgresql://...
REDIS_URL=redis://...
DATABASE_SYNCHRONIZE=true
```

在仓库根目录执行：

```bash
pnpm install
pnpm ssh:tunnel
pnpm start:dev
```

`start:dev` 会：

1. 连接 PostgreSQL。
2. 允许创建目标数据库。
3. 执行完整实体结构同步。
4. 检查 PostgreSQL 和 Redis。
5. 启动 HTTP 服务。

不要在已经由自动同步创建结构的同一个 `public` schema 上执行尚未标记的 baseline migration。Migration 的真实执行使用 `pnpm test:db` 在临时 schema 中验证。

## Development：Migration 模式

适合共享开发库、migration 联调和 production 上线前模拟。

在 `.env.local` 中配置：

```env
DATABASE_URL=postgresql://...
REDIS_URL=redis://...
DATABASE_SYNCHRONIZE=false
```

在仓库根目录执行：

```bash
pnpm install
pnpm ssh:tunnel
pnpm db:migration:up
pnpm start:dev
```

此模式下 HTTP 应用不会自动创建数据库或修改表，数据库结构只由显式执行的 migration 更新。
`db:migration:up` 失败时不要继续启动应用。

## 修改实体与生成 Migration

修改 `*.entity.ts` 后执行：

```bash
pnpm db:migration:create
pnpm db:migration:check
pnpm test:db
```

步骤：

1. 修改实体。
2. 执行 `db:migration:create` 生成 migration 和 snapshot。
3. 执行 `db:migration:check` 检查实体差异。
4. 审查 `apps/admin-api/src/infrastructure/database/migrations`。
5. 确认没有 `FOREIGN KEY` 或 `REFERENCES`。
6. 使用 `test:db` 在随机临时 schema 中执行全部 migration。
7. 确认首次 up、第二次 no-op、事务回滚和字典 CRUD 均通过。

`pack-release` 会自动按顺序执行 `db:migration:create` 和 `db:migration:check`。需要把 migration 应用到当前 development 数据库时，再显式执行 `pnpm db:migration:up`。生产服务器只执行编译后的 `pnpm db:migration:up:prod`。

## 测试

不连接真实基础设施的检查：

```bash
pnpm typecheck
pnpm test
pnpm test:e2e
pnpm build
```

真实 PostgreSQL 测试：

```bash
pnpm test:db
```

`test:db`：

- 使用 `.env.local` 的 DATABASE_URL。
- 创建随机 `admin_api_migration_test_*` schema。
- 不修改 `public`。
- 测试完成后精确删除本次 schema。
- DATABASE_URL 为空或账号不能创建 schema 时明确失败。

普通 unit 和 E2E 不执行真实 migration。

## Production 部署

production 必须设置：

```env
NODE_ENV=production
DATABASE_SYNCHRONIZE=false
```

即使误设 `DATABASE_SYNCHRONIZE=true`，代码仍会强制关闭同步。

### 1. 本地生成发布包

在仓库根目录执行：

```bash
pnpm pack:release
```

该命令会先在本地生成并检查 migration，再执行 production build，检查 compiled ORM 配置、migration、snapshot 和 production 快捷命令，然后生成：

```text
apps/admin-api/admin-api-release.zip
```

### 2. 上传并解压

将 `admin-api-release.zip` 上传到服务器并解压。真实 `DATABASE_URL`、`REDIS_URL` 等配置通过 1Panel、systemd、容器或服务器环境变量注入，不修改归档中的源码配置。

### 3. 服务器安装、迁移和启动

在服务器解压后的项目根目录依次执行：

```bash
pnpm install --prod
pnpm db:migration:up:prod
pnpm start:prod
```

顺序不可交换：

1. 本地通过 `pnpm pack:release` 生成经过检查的归档。
2. 上传并解压归档。
3. 安装 production 依赖。
4. 执行 compiled migration。
5. migration 成功后启动应用。

禁止：

- production 使用 `start:dev`。
- production 依赖 `.env.local`。
- migration 失败后继续启动。
- production HTTP 进程执行 SchemaGenerator 或 migration。

归档必须包含 compiled ORM 配置、compiled migration、snapshot 和 production CLI 依赖。

## 常用命令

以下命令均在根 `package.json` 和 `apps/admin-api/package.json` 中提供快捷脚本：

```text
build
start
start:dev
start:prod
pack:release
ssh:tunnel
db:migration:create
db:migration:check
db:migration:up
db:migration:up:prod
typecheck
test
test:watch
test:e2e
test:db
```

## HTTP 接口

```text
GET /api/v1/                    应用信息
GET /api/v1/health/live         进程存活
GET /api/v1/health/ready        PostgreSQL 和 Redis 就绪
GET /api/v1/docs                Swagger UI

/api/v1/dict/types              字典类型 CRUD
/api/v1/dict/data               字典数据 CRUD
```

成功响应使用统一外壳：

```json
{
	"code": 0,
	"message": "成功",
	"data": {},
	"requestId": "请求标识",
	"timestamp": "ISO 时间"
}
```

## 启动与健康检查

应用在监听 HTTP 前检查：

- PostgreSQL 连接。
- Redis PING。

任一失败则关闭已创建资源并退出。

应用启动时不扫描 migration 状态。development migration 模式和 production 都必须先执行对应的 `db:migration:up` 快捷命令，再启动 HTTP 应用。

运行期：

- `/health/live` 不访问外部依赖。
- `/health/ready` 检查 PostgreSQL 和 Redis。

## 日志

日志默认写入 `apps/admin-api/logs`。日志不得记录数据库或 Redis 完整连接串、用户名和密码。
