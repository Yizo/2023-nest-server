# 数据库版本、发布与恢复流程

## 首次部署

```text
创建 PostgreSQL / Redis
        ↓
备份检查（新库可跳过 dump，但必须确认目标库）
        ↓
运行 migrate
        ↓
运行 bootstrap-admin
        ↓
运行 queue-schedule-sync
        ↓
启动 API/Worker
        ↓
验证 readiness、登录、问卷提交、后台任务
```

这些步骤由部署流程显式调用。应用进程启动不执行迁移，也不创建默认角色。

## 每次版本升级

1. 在测试环境从生产备份的脱敏副本验证迁移耗时和结果。
2. 部署前生成 custom-format 备份，并保留 `.manifest` 和 `.sha256`。
3. 停止新流量或确认迁移是在线安全的。
4. 一次性运行 `migrate`，不能让每个 API 实例并发迁移。
5. 运行幂等的 `queue-schedule-sync`。
6. 启动新版本，检查 readiness 和关键业务冒烟测试。
7. 保留旧数据库和备份到观察期结束。

推荐使用 expand → migrate/backfill → switch → contract：

- 先增加允许为空的新列或新表；
- 分批回填历史数据；
- 应用切换到新结构；
- 下一个版本再删除旧列。

避免在同一次发布里直接重命名或删除仍被旧应用读取的字段。

## 新增权限、配置和角色

- 新权限属于代码功能定义，跟随 migration 幂等插入。
- 必需的系统配置可以通过 migration 插入，但不要覆盖管理员已经修改的值。
- 普通角色通过管理 API 创建和修改。
- 只有产品明确要求“升级后必须存在”的内置角色，才在版本 migration 中幂等新增；以后增加或修改也继续通过新的 migration 演进。

不要修改已经在任何环境执行过的 migration 文件。每次变化都创建一个时间戳更大的新 migration。

```bash
pnpm --filter survey-statistics db:create-migration
pnpm --filter survey-statistics db:status
pnpm --filter survey-statistics db:migrate
```

## 回滚决策

| 场景 | 处理方式 |
| --- | --- |
| 新代码尚未迁移数据库 | 直接停止发布 |
| 只做向后兼容的新增结构 | 回滚应用版本，保留新增结构 |
| 新迁移执行失败且事务已回滚 | 修复 migration，在测试库重新验证后发布 |
| 已发生数据转换或破坏性变更 | 不执行盲目 `down`；恢复到全新数据库并切换连接 |
| Redis 数据丢失 | 从 PostgreSQL 的 pending 记录运行 reconcile 补偿 |

基线 migration 的 `down` 会主动拒绝执行，因为删除全部业务表不是真实生产回滚方案。

## 恢复演练

1. 选择已验证 `.dump`，确认同目录存在 `.sha256`。
2. 创建全新的空目标数据库。
3. 执行 `db-restore.sh <dump> <new-database-url>`。
4. 比对迁移数、关键表数量和核心业务数据抽样。
5. 使用恢复库启动应用，验证 readiness、管理员登录和关键业务接口。
6. 更新部署系统中的 `DATABASE_URL`，滚动启动 API/Worker。
7. 观察稳定后再按保留策略处理旧数据库。

恢复脚本拒绝非空目标，避免误把恢复操作变成不可逆的原地覆盖。生产环境应定期自动备份，并至少按季度执行一次上述恢复演练。

## 无物理外键时的额外约束

当前表不建立物理外键，因此必须同时保留三层保护：

1. 写入前由 Service 检查引用对象存在且可用；
2. 所有关联 ID 建索引，并在事务中维护关系；
3. `orphan-check` 和队列完整性任务持续发现孤儿记录。

孤儿巡检只报告，不自动删除。修复数据前必须确认业务语义并留下审计记录。
