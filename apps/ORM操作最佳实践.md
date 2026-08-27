# TypeORM / MikroORM 工程级最佳实践

本文将规则分为四层，避免把项目约定误写成普适性能定律：

1. **强制正确性**：违反后可能产生错误数据、无界查询或连接泄漏。
2. **默认性能策略**：通常应采用，但允许基于数据量和执行计划调整。
3. **按场景选择**：JOIN、populate、select-in、IDs + Map 等没有唯一答案。
4. **证据验收**：用 SQL 次数、`EXPLAIN (ANALYZE, BUFFERS)`、p95 和连接池占用判断。

## 一、项目数据库政策

### 1.1 MikroORM v7 实体定义

admin-api 统一使用 `defineEntity + class + setClass()`，避免同时维护属性声明与 ORM 装饰器元数据：

```typescript
const UserSchema = defineEntity({
	name: "UserEntity",
	properties: {
		id: p.integer().primary().autoincrement(),
		name: p.string().length(100),
	},
});

export class UserEntity extends UserSchema.class {}

UserSchema.setClass(UserEntity);
```

不在同一应用中混用 legacy decorators、ES decorators 和 `defineEntity`。Nest Controller、DTO 和依赖注入仍使用 Nest 装饰器，它们不属于 ORM 实体定义。

### 1.2 不创建物理外键

admin-api 保留 ORM 关系，但 PostgreSQL 不创建物理外键：

```typescript
user: () => p.manyToOne(UserEntity)
	.joinColumn("user_id")
	.createForeignKeyConstraint(false),
```

ORM 配置再提供全局保护：

```typescript
schemaGenerator: {
	createForeignKeyConstraints: false,
}
```

这是本项目在明确部署和运维约束下的政策，不是所有 PostgreSQL 项目的通用性能结论。代价是：

- Service 必须校验关联对象存在且有效。
- 多表写入必须使用事务。
- 删除主记录时必须由应用处理关联记录。
- 跨表唯一性必须使用锁、冗余键或其它并发控制。
- 需要定期检查孤立数据。

### 1.3 关联索引按查询模式设计

关联列通常需要索引，但不能机械地为每列重复创建索引：

- 等值查找优先单列或复合索引的最左前缀。
- active 数据使用 partial index，例如 `WHERE deleted_at IS NULL`。
- 已有 unique/composite index 能覆盖查询时，不再重复建单列索引。
- 每个索引都会增加写放大、存储和 VACUUM 成本。

## 二、查询边界

### 2.1 列表必须有数量边界

业务列表至少满足一种边界：

- `where` 过滤。
- `limit` / `take`。
- cursor。
- 明确的小型字典全量缓存，上限由业务约束保证。

禁止无界读取大表：

```typescript
// 错误：未知数据量
await em.find(UserEntity, {});

// 正确：条件、排序和数量边界明确
await em.find(
	UserEntity,
	{ deletedAt: null },
	{
		fields: ["id", "name"],
		orderBy: { id: "asc" },
		limit: 100,
	},
);
```

### 2.2 字段选择是默认策略

以下场景必须显式选择字段：

- HTTP API 列表和详情。
- 宽表。
- 包含密码、令牌、内部备注等敏感字段的实体。
- populate 关系。
- 批量任务和导出。

```typescript
await em.findOne(
	UserEntity,
	{ id, deletedAt: null },
	{ fields: ["id", "name", "email"] },
);
```

窄表内部主键检查只取 `id`；受管实体更新应包含待修改字段和响应所需字段。不要为了复用建立复杂的通用字段选择框架。

### 2.3 模糊查询和索引

`ILIKE '%keyword%'` 无法使用普通 B-tree 前缀索引。数据量小的字典表可以接受；数据增长后应根据实际查询改用：

- 前缀匹配。
- `pg_trgm` GIN/GiST。
- 搜索服务。

优化前先记录数据量和执行计划。

## 三、关联加载策略

### 3.1 不把 JOIN 或 populate 一律判错

选择策略时先看关系基数和结果上限：

| 场景 | 推荐策略 |
|---|---|
| bounded ManyToOne / OneToOne | JOIN 或 MikroORM BALANCED populate |
| 一个小型 to-many | select-in 或受控 JOIN |
| 多个 to-many | select-in，避免笛卡尔积 |
| 子表结果大 | 独立分页接口 |
| 多组结果需复用 | IDs + 分块查询 + Map |

MikroORM 示例：

```typescript
await em.find(
	OrderEntity,
	{ status: "paid" },
	{
		populate: ["user"],
		strategy: LoadStrategy.JOINED,
		fields: ["id", "total", "user.id", "user.name"],
		limit: 100,
	},
);
```

### 3.2 IDs + Map 的适用场景

当多个 to-many JOIN 会产生行数膨胀时：

```text
查询主表分页
  ↓
提取并去重关联 ID
  ↓
按 200～500 分块
  ↓
按连接池容量限制并发
  ↓
Map 组装
```

不能无界执行：

```typescript
await Promise.all(allChunks.map(loadChunk));
```

并发数必须小于连接池可用连接，例如使用 2～4 个 worker。

### 3.3 禁止 N+1

禁止循环内执行关联查询或逐条写入：

```typescript
for (const user of users) {
	await em.find(PostEntity, { user });
}
```

应改为 populate、批量 `IN` 或聚合查询。

### 3.4 每个父记录前 N 条

在 `WHERE parent_id IN (...)` 的普通查询上设置 `limit: 5`，只能限制总结果为 5 条，不能保证每个父记录 5 条。

正确方案：

- PostgreSQL `ROW_NUMBER() OVER (PARTITION BY ...)`。
- LATERAL JOIN。
- MikroORM per-parent populate limit。
- 独立分页接口。

## 四、写入与并发一致性

### 4.1 单表写入

单实体 `flush()` 会由 MikroORM Unit of Work 处理。批量更新使用 `nativeUpdate`，但要明确它会绕过实体生命周期逻辑：

```typescript
await em.nativeUpdate(
	TaskEntity,
	{ id: { $in: ids } },
	{ status: "done" },
);
```

禁止循环内逐条 flush。

### 4.2 多表写入使用事务

MikroORM 使用编程式事务：

```typescript
await em.transactional(async (tx) => {
	// 只执行本地数据库操作
});
```

TypeORM 对应 `QueryRunner`；不要把 TypeORM API 当成 MikroORM 的强制写法。

事务内禁止：

- HTTP / RPC。
- Redis。
- MQ。
- 文件系统。
- 无界循环。
- 用户交互等待。

### 4.3 无物理外键时的写入顺序

```text
新增：主表 → 关联表
删除：关联表 → 子表 → 主表
```

全部步骤在同一事务中完成。

### 4.4 唯一约束与父记录锁分工

唯一键位于同一张表时，优先使用数据库 unique index，并在 Service 中做写前检查和异常转换。仅依赖“先查后写”仍有并发竞态，数据库约束负责最终兜底。

项目不使用物理外键时，创建子记录和删除父记录必须锁定同一父记录，避免父记录删除过程中插入新的有效子数据：

```typescript
await em.findOne(
	DictTypeEntity,
	{ id: typeId },
	{ lockMode: LockMode.PESSIMISTIC_WRITE },
);
```

创建和删除必须遵守相同锁顺序并缩短事务时间。相同父记录的生命周期写入串行，不同父记录保持并行；不要为了已有 unique index 再额外加锁。

### 4.5 嵌套事务和声明式事务

Savepoint 和 `@Transactional()` 不是天然错误，MikroORM支持它们。但本项目默认：

- Service 使用显式 `em.transactional()`。
- 不引入事务装饰器。
- 不隐式嵌套业务事务。
- 如果未来确需嵌套，必须明确 propagation 和锁顺序。

## 五、跨服务一致性

禁止在数据库事务中调用外部服务。

标准 transactional outbox：业务数据与 outbox 记录必须写入同一事务：

```typescript
await em.transactional(async (tx) => {
	tx.persist(order);
	tx.persist(outboxEvent);
});
```

事务提交后由异步 worker 投递；投递成功后幂等标记 outbox 完成。

## 六、分页与批处理

- 后台浅分页：offset + limit 可接受。
- 深分页：cursor / keyset。
- 全量导出：按主键游标分批。
- 字典缓存：仅在确认上限后允许全量加载。
- 所有批处理都要限制单批大小和并发数。

## 七、Schema 与 Migration

### 7.1 默认不自动同步

```env
DATABASE_SYNCHRONIZE=false
```

未配置时同样为 false。

### 7.2 Development 显式完整同步

只有非 production 显式设置：

```env
DATABASE_SYNCHRONIZE=true
```

应用才执行无 safe/drop 限制的 `schema.update()`。它可能创建、修改或删除表、字段和索引，只允许用于可重建的个人开发库。

### 7.3 Production migration-only

production 永远关闭同步：

```text
安装依赖
  ↓
migration up
  ↓
启动应用
```

Migration 与 snapshot 同时版本控制。应用启动只检查 PostgreSQL 和 Redis 是否可用，不生成或执行 migration。

## 八、性能验收

性能结论必须记录证据：

- SQL 数量。
- 返回行数和字段数。
- `EXPLAIN (ANALYZE, BUFFERS)`。
- p50 / p95 / p99。
- PostgreSQL CPU、IO 和锁等待。
- 连接池 active / idle / wait。
- Node.js heap 和事件循环延迟。

事务时长的 200ms/1s 只能作为初始观察值，最终阈值按业务 SLO 和锁影响调整。

## 九、Code Review 清单

- [ ] 查询有 where、limit 或明确的小表例外。
- [ ] API 查询只选择必要字段。
- [ ] 没有循环查询和循环 flush。
- [ ] 关联加载策略与关系基数匹配。
- [ ] 关联字段索引覆盖实际查询且不重复。
- [ ] 多表写入在同一事务中。
- [ ] 事务内没有外部 IO。
- [ ] 无外键关联的存在性和删除顺序由 Service 保证。
- [ ] 先查后写的唯一性有数据库约束或并发锁。
- [ ] development 同步和 migration 不管理同一个 schema。
- [ ] production 不执行 SchemaGenerator。
- [ ] migration、snapshot 和真实 PostgreSQL 测试一致。
- [ ] 性能优化有执行计划或监控数据，不凭规则猜测。
