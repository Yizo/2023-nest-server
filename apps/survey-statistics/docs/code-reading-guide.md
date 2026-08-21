# 代码阅读顺序

这份文档给刚开始学习 NestJS 后端工程化的人使用。建议不要从 300 行 migration 开始逐行读，而是先沿着一次请求走一遍。

## 1. 先看进程入口

```text
src/main.ts
  ├─ AppModule       API 进程
  └─ WorkerModule    队列 Worker 进程
```

- `main.ts` 只负责启动进程、注册全局前缀、Helmet、CORS、ValidationPipe 和 Swagger。
- `PROCESS_ROLE=all` 同时启动 API 和 Worker。
- `PROCESS_ROLE=api` 只启动 HTTP 服务。
- `PROCESS_ROLE=worker` 只消费 BullMQ。

## 2. 再看全局请求链

一个请求大致经过：

```text
RequestIdMiddleware
  ↓
ThrottlerGuard
  ↓
JwtAuthGuard
  ↓
PermissionGuard
  ↓
Controller
  ↓
Service / Queries
  ↓
ApiResponseInterceptor 或 ApiExceptionFilter
```

推荐阅读：

- `common/middleware/request-id.middleware.ts`
- `modules/auth/auth.guards.ts`
- `common/interceptors/api-response.interceptor.ts`
- `common/filters/api-exception.filter.ts`

## 3. 用身份权限模块理解 Nest DI

从 `modules/identity/identity.controller.ts` 开始：

1. Controller 用 `@RequirePermissions("role.create")` 声明所需能力。
2. `PermissionGuard` 读取 metadata。
3. `AuthorizationService` 查询用户、角色、权限关系。
4. `IdentityService` 在事务中写用户、角色和关系表。
5. `database/entities/identity.entities.ts` 描述 MikroORM 实体。

这里最重要的概念是：

- DTO 校验输入格式；
- Guard 校验是否有权限；
- Service 校验业务规则；
- Entity 描述数据库字段；
- Migration 描述数据库版本。

## 4. 用问卷提交理解事务

阅读顺序：

1. `modules/survey/survey.dto.ts`
2. `modules/survey/survey.controller.ts`
3. `modules/survey/survey.service.ts`
4. `modules/survey/survey.queries.ts`
5. `database/entities/survey.entities.ts`

提交答卷时，Service 会在一个事务内：

- 确认问卷处于 published；
- 检查用户是否重复提交；
- 检查问题、选项和必答项；
- 写入 response 和 answers；
- 写入待投递 notification。

事务提交成功后，才调用 `BackgroundJobsService` 发布队列任务。这样 Redis 暂时故障不会让已经提交的答卷丢失。

## 5. 用监控模块理解“原始记录表 + 异步处理”

`modules/monitoring/monitoring.service.ts` 先把客户端错误写入 `client_errors`，然后发送 `monitor.error.aggregate` 任务。

Worker 处理任务时：

1. 用 `processed_at is null` 找到尚未处理的记录，并在事务中标记它；
2. 写入或更新 `client_error_groups`；
3. 同一个错误事件可以安全重试。

如果队列任务丢失，`reconcile` 会根据 PostgreSQL 的 pending 状态补发。

## 6. 最后阅读部署工具

- `tools/cli.ts migrate`：执行结构迁移。
- `tools/cli.ts migration-status`：查看已执行和待执行迁移。
- `tools/cli.ts bootstrap-admin`：创建首个平台所有者。
- `tools/cli.ts queue-schedule-sync`：同步周期任务。
- `scripts/db-backup.sh`：备份并生成 manifest/checksum。
- `scripts/db-restore.sh`：只允许恢复到空数据库。

应用启动不会自动调用这些命令，这是为了避免多实例同时迁移或每次启动重复初始化。

## 7. 修改代码时的判断顺序

遇到新需求时先问：

1. 这是数据库结构变化，还是业务数据变化？
2. 这是必须立即写入的核心记录，还是可以稍后执行的附带动作？
3. 这是输入格式问题、权限问题，还是业务规则问题？
4. 是否需要新增 migration、permission code、DTO、Service 或 Query？
5. 是否需要补单元测试和 E2E 测试？

不要先在 Controller 里写 SQL，也不要在应用启动钩子里偷偷写初始化数据。
