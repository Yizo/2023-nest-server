# Survey Statistics Service

这是一个基于 `nestjs` + `typeorm` 的问卷统计服务，复用了 `nest-admin` 的线上 MySQL/Redis 配置（MySQL：`39.96.165.134:13306`，Redis：`39.96.165.134:6379`，数据库名 `survey_statistics`），并通过 `TypeORM` 的 `createForeignKeyConstraints: false` 保留应用层关系。

## 特性

-   `POST /api/auth/register` / `POST /api/auth/login`：用户名/邮箱注册与 JWT 登录，密码使用 `bcrypt` 加密，登录返回 `accessToken`。
-   `POST /api/surveys`、`PATCH /api/surveys/:id`、`DELETE /api/surveys/:id`：问卷的增删改；所有修改仅允许问卷拥有者操作。
-   `GET /api/surveys` / `GET /api/surveys/:id`：查询问卷列表或单个详情；支持 `limit`/`offset` 分页。
-   `POST /api/surveys/:id/responses`：认证用户提交问卷回答（手动维护 `surveyId`/`userId` 字段）。
-   `GET /api/surveys/:id/results`：统计问卷答题人数、按题目和答案聚合。
-   `GET /api/health`：健康检查。

## 运行

```bash
# 开发模式
pnpm --filter survey-statistics start:dev

# 构建
pnpm --filter survey-statistics build
pnpm --filter survey-statistics start:prod
```

## Docker + PM2

通过 `apps/survey-statistics/docker/docker-compose.yml` 构建并使用 PM2 启动：

```bash
cd apps/survey-statistics/docker
docker compose up --build -d
```

容器将从 `pnpm-workspace` 拉取依赖并执行 `pm2-runtime --interpreter ts-node/register pm2.config.ts --env production`。环境变量已在 `docker-compose` 中指定，确保 `DB_*` 与 `REDIS_*` 指向 `39.96.165.134` 节点（Redis 需配置 `123456` 密码）。

## 测试

```bash
pnpm --filter survey-statistics test
pnpm --filter survey-statistics test:e2e
```

## 默认密码

```bash
node -e "const bcrypt=require('bcrypt'); bcrypt.hash('123456',10).then(console.log)"
// $2b$10$M.TotsrNomrQ.DQx171.9up7SBArHc8YmblLs9ghwPz9ZeocQvpv6
```

测试依赖 `supertest`，默认执行 `/api/health`。
