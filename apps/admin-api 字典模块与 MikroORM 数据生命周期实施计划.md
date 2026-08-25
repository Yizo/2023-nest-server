# admin-api 字典模块与 MikroORM 数据生命周期实施计划

## 当前架构

- NestJS 通过 `@mikro-orm/nestjs` 的 `MikroOrmModule.forRootAsync()` 管理 ORM 注入、RequestContext 和关闭生命周期。
- Nest HTTP 进程和 MikroORM CLI 复用同一个 `createMikroOrmOptions()`。
- 实体使用匹配模式发现：
  - source：`src/**/*.entity.ts`
  - compiled：`dist/**/*.entity.js`
- 业务代码只通过统一配置对象读取环境配置。
- development 默认不修改数据库；显式开启同步后允许完整 schema update。
- production 永远禁止自动同步，只通过 migration 修改结构。

## 三表模型

### `sys_dict_type`

- 数字自增主键。
- `dict_name`。
- `dict_type`。
- `status`，只允许 `0/1`。
- `remark`。
- `created_at`、`updated_at`、`deleted_at`。
- active `dict_type` partial unique index。

### `sys_dict_data`

- 数字自增主键。
- `label`。
- `value`。
- `sort`。
- `status`，只允许 `0/1`。
- `remark`。
- `created_at`、`updated_at`、`deleted_at`。

### `sys_dict_type_data`

- 独立显式实体，不使用隐式 ManyToMany pivot。
- `dict_type_id`：ManyToOne 映射到字典类型。
- `dict_data_id`：ManyToOne 映射到字典数据。
- 两个关系都设置 `createForeignKeyConstraint: false`。
- 数据库不创建 FOREIGN KEY。
- active `dict_type_id` 查询索引。
- active `dict_data_id` partial unique index，保证一条有效数据只属于一个有效类型。
- 关联自身支持软删除。

## 无物理外键规则

ORM 关系保留，用于过滤、排序和 populate：

```typescript
@ManyToOne(() => DictTypeEntity, {
	createForeignKeyConstraint: false,
})
dictType!: Rel<DictTypeEntity>;
```

ORM 全局同时关闭外键生成：

```typescript
schemaGenerator: {
	createForeignKeyConstraints: false,
}
```

关联完整性由 Service 负责：

- 创建数据前检查有效类型。
- 删除数据时同时软删除关联。
- 删除类型时先软删除关联，再批量软删除数据，最后软删除类型。
- 所有多表写入在 `em.transactional()` 中完成。

## 字典 Service

保持一个 `DictController` 和一个 `DictService`。

接口：

```text
POST   /api/v1/dict/types
GET    /api/v1/dict/types
GET    /api/v1/dict/types/:id
POST   /api/v1/dict/types/:id/update
POST   /api/v1/dict/types/:id/remove

POST   /api/v1/dict/data
GET    /api/v1/dict/data
GET    /api/v1/dict/data/:id
POST   /api/v1/dict/data/:id/update
POST   /api/v1/dict/data/:id/remove
```

规则：

- `dictType` 创建后不可修改。
- 字典数据所属类型创建后不可修改。
- 同一类型下 value 必须唯一。
- 不同类型允许相同 value。
- 所有普通查询显式排除 `deletedAt` 非空记录。
- 列表使用数据库分页和稳定排序，pageSize 最大 100。
- 查询按用途指定最小 fields。
- bounded to-one 列表和详情允许使用显式加载策略的 populate。
- 类型删除只读取关联 ID 和数据 ID，不加载完整数据实体。
- Service 映射为普通响应对象，不直接返回实体和 deletedAt。

### 并发唯一性

同类型 value 分散在类型、数据和关联表，普通 unique index 无法跨表约束。

创建或修改 value 时：

```text
开始事务
  ↓
锁定 DictType 行（PESSIMISTIC_WRITE）
  ↓
检查同类型 value
  ↓
写入数据和关联
  ↓
提交
```

相同类型写入串行，不同类型保持并行。

## 同步与 Migration

### 默认模式

```env
DATABASE_SYNCHRONIZE=false
```

未配置时同样为 false。

应用只连接数据库并检查全部实体表和 migration，不执行 DDL。

### Development 自动同步

```env
NODE_ENV=development
DATABASE_SYNCHRONIZE=true
```

启动时执行完整 `orm.schema.update()`，允许创建、修改和删除数据库对象。只用于可重建的个人开发库。

自动同步 schema 不执行 migration；不能再直接运行尚未标记的 baseline migration。

### Production

production 强制：

```text
synchronize=false
ensureDatabase=false
```

完整部署顺序：

```text
本地 pnpm pack:release
  ↓
上传并解压 admin-api-release.zip
  ↓
服务器 pnpm install --prod
  ↓
pnpm db:migration:status:prod
  ↓
pnpm db:migration:up:prod
  ↓
pnpm start:prod
```

必须先执行 compiled migration，再启动 HTTP 应用。

## 启动结构检查

启动检查动态读取全部 ORM metadata 和全部 migration 文件，不写死当前三张表。

`synchronize=true`：

1. 连接数据库。
2. 完整 schema update。
3. 检查全部实体表存在。
4. 检查 Redis。

`synchronize=false`：

1. `SELECT 1`。
2. 检查全部实体表。
3. 只读查询 migration tracking table。
4. 比较 expected、executed、pending、extra。
5. pending 导致启动失败。
6. extra 只警告。
7. 检查 Redis。

状态检查不得调用可能创建 tracking table 的 Migrator API。

## Migration 文件与 Snapshot

- source：`src/infrastructure/database/migrations`。
- compiled：`dist/infrastructure/database/migrations`。
- migration 文件与 `.snapshot-admin-api.json` 同时版本控制。
- production 不改写 snapshot。
- migration transactional 和 allOrNothing 开启。
- migration 生成禁止自动 drop 未注册表。
- migration SQL 不包含 FOREIGN KEY。

## Migration 真实测试

`test:db` 使用 `.env.local` 的 DATABASE_URL，但不修改 public。

每次测试：

1. 创建 `admin_api_migration_test_<随机后缀>`。
2. 从零执行全部 migration。
3. 第二次 up 验证 no-op。
4. 校验 tracking table、索引、CHECK 和无物理外键。
5. 执行真实字典 CRUD、并发唯一和事务回滚测试。
6. 比较 public 测试前后状态。
7. `finally` 精确删除本次 schema。

删除前必须验证 schema 前缀、字符集、所有者和非 public，任何条件不满足都禁止 DROP。

## 测试范围

- 配置默认 false、显式 true 和 production 强制 false。
- ORM entity discovery 和 metadata。
- schema SQL 不含物理外键。
- fields 和加载策略。
- 类型行锁。
- 多表事务和批量软删除。
- 只读 migration status。
- 全量实体和 migration 启动检查。
- 临时 schema migration、no-op、回滚和 CRUD。
- HTTP DTO、中文异常和响应外壳。

## 不在本轮范围

- JWT 和权限控制。
- Redis 业务缓存。
- Seed。
- 恢复和物理删除接口。
- 批量导入。
- Redis Cluster/Sentinel。
- PostgreSQL 读写分离。
