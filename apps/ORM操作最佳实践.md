# TypeORM/MikroORM 工程级最佳实践手册

> **架构核心理念**：数据库仅作存储引擎，计算与关联压力上移至应用层，服务可水平扩展。

## 一、基础架构规范

### 1.1 物理外键

```typescript
@ManyToOne(() => User, { createForeignKeyConstraints: false })
@Index()
user: User;
```

-   **强制要求**：所有 `@ManyToOne` / `@OneToOne` 必须设置 `createForeignKeyConstraints: false`，数据库不维护引用完整性
-   **代价**：写入顺序和事务回滚由应用层全权负责

### 1.2 数据库索引（性能生命线）

-   **强制要求**：所有外键字段必须加 `@Index()`
-   **理由**：物理外键禁用后，索引是关联查询性能的唯一保障，缺失会导致全表扫描

```typescript
@Entity()
export class Post {
	@ManyToOne(() => User, { createForeignKeyConstraints: false })
	@Index() // 👈 必须加
	user: User;
}
```

### 1.3 字段查询原则

```typescript
// ✅ 正确
const users = await repo.find({
	select: ["id", "name", "email"],
});

// ❌ 绝对禁止
const users = await repo.find(); // 等同于 SELECT *
```

-   **强制要求**：所有查询必须显式 `.select()` 指定字段
-   **理由**：减少网络传输、降低内存占用、防止敏感字段泄露

### 1.4 WHERE 条件铁律

```typescript
// ❌ 绝对禁止（开发调试都可能打爆数据库）
const all = await repo.find();

// ✅ 正确：必须带条件
const users = await repo.find({
	where: { id: MoreThan(lastId) },
});
```

-   **强制要求**：所有 `.find()` 必须带 `where` 条件
-   **例外**：仅当表明确为字典表（< 5000 条）且用于本地缓存初始化时允许

## 二、查询规范

### 2.1 单表查询

```typescript
// ✅ 走索引查询
const user = await repo.findOne({
	where: { id: userId },
	select: ["id", "name", "email"],
});
```

-   **最佳实践**：直接走主键/索引查询，取回原始数据
-   **禁止**：单表查询中使用 `relations` 触发隐式 JOIN

### 2.2 多表联合查询（核心范式）

**原则：先查主表 → 提取 IDs → 分块并发查子表 → 内存 Map 组装**

```typescript
import { In } from "typeorm";
import { chunk } from "lodash";

async function getPostsWithAuthorsAndComments(page: number, pageSize: number = 20) {
	// 1️⃣ 主表分页查询（数据库层，走索引，LIMIT 截断）
	const posts = await postRepo.find({
		where: { status: "published" },
		order: { createTime: "DESC" },
		skip: (page - 1) * pageSize,
		take: pageSize,
		select: ["id", "title", "content", "authorId"],
	});

	if (posts.length === 0) return { list: [] };

	// 2️⃣ 提取关联 ID（必须去重）
	const authorIds = [...new Set(posts.map((p) => p.authorId))];
	const postIds = posts.map((p) => p.id);

	// 3️⃣ 分块 + 并行查询子表（Promise.all 压满网络 IO）
	// 分块防止 SQL 过长（IN 子句长度限制）
	const authorChunks = chunk(authorIds, 500);
	const commentChunks = chunk(postIds, 500);

	const [authorResults, commentResults] = await Promise.all([
		Promise.all(
			authorChunks.map((ids) =>
				userRepo.find({
					where: { id: In(ids) },
					select: ["id", "name", "avatar"],
				}),
			),
		),
		Promise.all(
			commentChunks.map((ids) =>
				commentRepo.find({
					where: { postId: In(ids) },
					select: ["id", "content", "postId"],
					take: 5, // ⚠️ 关键：限制每条文章的评论数量，防止数据爆炸
				}),
			),
		),
	]);

	const authors = authorResults.flat();
	const comments = commentResults.flat();

	// 4️⃣ 内存 Map 组装（O(n) 时间复杂度，严禁循环内 find）
	const authorMap = new Map(authors.map((a) => [a.id, a]));
	const commentMap = new Map();
	comments.forEach((c) => {
		if (!commentMap.has(c.postId)) commentMap.set(c.postId, []);
		commentMap.get(c.postId).push(c);
	});

	// 5️⃣ 挂载返回
	return posts.map((post) => ({
		...post,
		author: authorMap.get(post.authorId) || null,
		comments: commentMap.get(post.id) || [],
	}));
}
```

### 2.3 子表数据量爆炸陷阱

| 场景                  | 正确做法                             | 错误做法                          |
| :-------------------- | :----------------------------------- | :-------------------------------- |
| 列表页展示评论数      | 用 `.count()` + `groupBy` 聚合       | `.find()` 拉取全部评论内容        |
| 列表页展示前 N 条评论 | 子表查询加 `.take(N)`                | 无条件拉取全部                    |
| 详情页展示全部评论    | 独立接口分页查询评论，不跟主表一起查 | 在主表查询中 `LEFT JOIN` 全部评论 |

```typescript
// ✅ 列表页只查评论数
const commentCounts = await commentRepo
	.createQueryBuilder("c")
	.select("c.postId", "postId")
	.addSelect("COUNT(*)", "count")
	.where("c.postId IN (:...postIds)", { postIds })
	.groupBy("c.postId")
	.getRawMany();
```

### 2.4 绝对禁止：N+1 查询

```typescript
// ❌ 万恶之源：循环内查询
const users = await userRepo.find();
for (const user of users) {
	user.posts = await postRepo.find({ where: { userId: user.id } });
	// 100 个用户 = 101 条 SQL
}

// ✅ 正确：批量查询 + Map 组装
const users = await userRepo.find();
const userIds = users.map((u) => u.id);
const posts = await postRepo.find({ where: { userId: In(userIds) } });
const postMap = new Map();
posts.forEach((p) => {
	if (!postMap.has(p.userId)) postMap.set(p.userId, []);
	postMap.get(p.userId).push(p);
});
```

## 三、写入规范

### 3.1 单表写入

```typescript
// ✅ 批量更新（1 条 SQL）
await repo.update({ id: In(ids) }, { status: "done" });

// ✅ 批量插入（1 条 SQL）
await repo.insert([{ name: "A" }, { name: "B" }]);

// ❌ 绝对禁止：循环内逐条操作
for (const item of items) {
	await repo.save(item); // N 条 SQL，连接池杀手
}
```

### 3.2 多表联合写入——必须使用事务

**事务内操作顺序铁律：**

-   **新增/修改**：先主表 → 再从表（先获取主表生成的 ID）
-   **删除**：先从表 → 再主表（先清理孤儿数据）

```typescript
async function deleteUserWithRelatedData(userId: number) {
	const queryRunner = dataSource.createQueryRunner();
	await queryRunner.connect();
	const startTime = Date.now();

	try {
		await queryRunner.startTransaction();

		// 1️⃣ 先删子表（从表）
		await queryRunner.manager.delete(Post, { userId });
		await queryRunner.manager.delete(Comment, { userId });
		await queryRunner.manager.delete(Profile, { userId });

		// 2️⃣ 再删主表
		await queryRunner.manager.delete(User, { id: userId });

		await queryRunner.commitTransaction();

		// 3️⃣ 长事务监控
		const duration = Date.now() - startTime;
		if (duration > 500) {
			logger.warn(`Long Transaction: ${duration}ms, userId: ${userId}`);
		}
	} catch (error) {
		await queryRunner.rollbackTransaction();
		logger.error("Transaction failed, rollback completed", error);
		throw error;
	} finally {
		await queryRunner.release();
	}
}
```

## 四、事务管理工程铁律

### 4.1 强制使用编程式事务

```typescript
// ✅ 正确：显式 QueryRunner
const qr = dataSource.createQueryRunner();
await qr.connect();
await qr.startTransaction();
try {
	/* ... */ await qr.commitTransaction();
} catch {
	await qr.rollbackTransaction();
} finally {
	await qr.release();
}

// ❌ 绝对禁止：声明式事务（装饰器/注解）
// @Transaction()  // Node.js 异步环境下极易连接泄漏
// @Transactional()
```

**理由**：

-   声明式事务依赖代理捕获异常，Node.js 异步环境下 `Promise.reject` 可能未被正确捕获，导致 `QueryRunner` 永不释放，连接池耗尽
-   编程式事务边界在 Code Review 时一目了然

### 4.2 严格禁止事务嵌套

```typescript
// ❌ 绝对禁止
await qr.startTransaction();
try {
	await qr.startTransaction(); // 嵌套！会导致死锁风险
	// ...
} catch {
	/* ... */
}
```

**理由**：数据库嵌套事务本质是 Savepoint，内层回滚时外层持有的锁不释放，极易死锁

### 4.3 严禁长时间事务

| 级别    | 阈值    | 行动               |
| :------ | :------ | :----------------- |
| 🔴 高危 | > 1 秒  | 阻断上线，必须拆分 |
| 🟡 警告 | > 200ms | 核心链路必须优化   |

**事务内绝对禁止的操作：**

-   ❌ 远程 RPC/HTTP 调用（axios/fetch）
-   ❌ Redis/MQ 等网络 IO
-   ❌ 复杂循环计算（> 1000 次）
-   ✅ 仅允许：纯粹的 CRUD 操作

**监控 SQL（DBA 巡检）：**

```sql
-- MySQL
SELECT * FROM information_schema.innodb_trx
WHERE TIME_TO_SEC(timediff(now(), trx_started)) > 1;

-- PostgreSQL
SELECT pid, now() - xact_start AS duration, query
FROM pg_stat_activity
WHERE state = 'active' AND now() - xact_start > interval '1 seconds';
```

### 4.4 跨服务调用——分布式一致性

```typescript
// ❌ 万恶之源：远程调用在事务内
await qr.startTransaction();
try {
	await saveLocal();
	await axios.post("/external"); // 网络IO在事务内！
	await qr.commitTransaction();
} catch {
	qr.rollback();
}
```

**正确方案 A（先外后内 + 补偿）：**

```typescript
// 1️⃣ 先调外部服务
const extResult = await callExternal(data);
// 2️⃣ 外部成功，再开本地事务
const qr = dataSource.createQueryRunner();
await qr.startTransaction();
try {
	await saveLocal(extResult.id);
	await qr.commitTransaction();
} catch (dbError) {
	await qr.rollbackTransaction();
	// 3️⃣ 立即调用外部冲正/补偿接口
	await callExternalCompensation(extResult.id);
	throw new Error("分布式事务已回滚，外部已补偿");
}
```

**正确方案 B（本地任务表 + 最终一致性）：**

```typescript
// 本地事务：只写任务表，不写业务表
await qr.startTransaction();
try {
    await pendingTaskRepo.insert({
        type: 'EXTERNAL_SYNC',
        payload: data,
        status: 'PENDING'
    });
    await qr.commitTransaction();
} catch { /* ... */ }

// 异步定时任务扫描处理
@Cron('*/5 * * * *')
async processPendingTasks() {
    const tasks = await pendingTaskRepo.find({ where: { status: 'PENDING' } });
    for (const task of tasks) {
        const result = await callExternal(task.payload);
        // 更新本地业务表 + 标记任务完成
    }
}
```

## 五、排序与分页策略

### 5.1 决策矩阵

| 业务场景             | 排序位置           | 实现方案                                                | 内存安全保证                 |
| :------------------- | :----------------- | :------------------------------------------------------ | :--------------------------- |
| 前端列表/后台管理    | **数据库层**       | `ORDER BY ... LIMIT 20 OFFSET 0`                        | 数据库只返回 20 条           |
| 深翻页（第 1000 页） | **数据库层**       | 游标分页：`WHERE id < lastId ORDER BY id DESC LIMIT 20` | 避免 OFFSET 全表扫描         |
| 定时任务/全量导出    | **应用层（分批）** | `WHERE id > lastId LIMIT 1000`，每批内存排序            | 大排序拆小批量               |
| 本地缓存/字典表      | **应用层（全量）** | 启动时 `find()` + `Array.sort()`                        | 开发者业务常识保证 < 5000 条 |

### 5.2 游标分页模板

```typescript
async function exportAllData() {
	let lastId = 0;
	const CHUNK_SIZE = 1000;
	let hasMore = true;

	while (hasMore) {
		const batch = await repo.find({
			where: { id: MoreThan(lastId) },
			order: { id: "ASC" },
			take: CHUNK_SIZE,
			select: ["id", "name", "createTime"],
		});

		if (batch.length === 0) {
			hasMore = false;
		} else {
			// 内存排序仅针对本批次
			const sorted = batch.sort((a, b) => a.createTime - b.createTime);
			await processBatch(sorted);
			lastId = batch[batch.length - 1].id;
		}
	}
}
```

## 六、O/RM 选型工程建议（2026）

| 维度               | TypeORM          | Prisma                    | MikroORM                       |
| :----------------- | :--------------- | :------------------------ | :----------------------------- |
| GitHub Open Issues | ~479             | ~2,474（积压严重）        | ~148（最少）                   |
| 核心模式           | Data Mapper / AR | Schema-first, 生成 Client | **Data Mapper + Unit of Work** |
| 长期维护风险       | 中等             | **高**（Issue 积压）      | **低**（维护活跃）             |
| 工程推荐度         | ⭐⭐             | ⭐⭐                      | ⭐⭐⭐⭐⭐                     |

**结论**：

-   **Prisma**：开发体验好，但 Rust 引擎是"黑盒"，版本升级风险高
-   **TypeORM**：功能全但技术债务重，Issue 长期未解决
-   **MikroORM**：学习曲线稍陡，但架构严谨、维护质量高，最契合"压力上移"工程理念

## 七、红线清单（Code Review 必查）

| #   | 红线                                    | 风险                 |
| :-- | :-------------------------------------- | :------------------- |
| 1   | 无 `where` 条件的 `.find()`             | 连接池/内存打爆      |
| 2   | 循环内 `await repo.save()`              | N+1 写入，性能灾难   |
| 3   | 循环内 `await repo.find()` 查关联       | N+1 查询，性能灾难   |
| 4   | 多表写入无 `QueryRunner` 事务           | 数据不一致，孤儿数据 |
| 5   | 事务内包含远程调用（axios）             | 连接池耗尽，系统雪崩 |
| 6   | 声明式事务装饰器                        | 连接泄漏风险         |
| 7   | 事务嵌套                                | 死锁风险             |
| 8   | 内存组装用 `Array.find` 而非 `Map`      | O(n²)，CPU 爆满      |
| 9   | `relations: [...]` 隐式 JOIN 且数据量大 | 数据库压力爆炸       |
| 10  | 外键字段未加 `@Index()`                 | 关联查询全表扫描     |

## 八、扩展性检验标准（自测三问）

写完一段查询代码后，问自己：

1. **这条 SQL 是否只走了主键或唯一索引？**

    - ✅ 是 → 数据库安全
    - ❌ 否 → 加索引或重构

2. **返回的数据是否只取了必要字段，且数据量控制在百级以内？**

    - ✅ 是 → 网络传输安全
    - ❌ 否 → 加 `.select()` 或分块

3. **如果并发量翻 10 倍，这台 Node 机器内存会爆吗？**
    - ✅ 不会 → 通过
    - ❌ 会 → 加入分块或流式逻辑

---

_最后更新：2026-08-17_
