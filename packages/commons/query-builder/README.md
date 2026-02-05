# Query Builder 使用指南

## 概述

Query Builder 是基于 TypeORM 的统一查询构建工具，提供简洁易用的 API 来构建复杂的数据库查询。

**核心特性：**

-   ✅ 支持复杂的多表关联查询
-   ✅ 自动按索引优化条件顺序
-   ✅ 支持自定义表别名
-   ✅ SELECT 字段按 TypeORM 原生方式处理
-   ✅ 查询构建顺序已优化（JOIN → SELECT → WHERE → GROUP BY → HAVING → ORDER BY）

## TypeORM 查询语句书写推荐顺序

### 📋 标准查询构建顺序

在 TypeORM 中，查询语句的执行顺序非常重要。我们的 Query Builder 已经按照最优顺序自动处理：

```typescript
// 查询构建的标准顺序
queryBuilder
  // 1. 创建查询构建器（指定主表别名）
  .createQueryBuilder('alias')

  // 2. 软删除处理
  .withDeleted()

  // 3. JOIN 关联（必须在 SELECT 之前）
  .leftJoin('alias.relation', 'relationAlias')
  .leftJoinAndSelect('alias.profile', 'profile')

  // 4. SELECT 字段选择（必须在 JOIN 之后）
  // ⚠️ 关键：SELECT 必须在 JOIN 之后，才能覆盖 joinAndSelect 自动添加的字段
  .select(['alias.id', 'alias.name', 'profile.bio'])

  // 5. WHERE 条件（主查询条件）
  .where('alias.status = :status', { status: 1 })
  .andWhere('alias.age > :age', { age: 18 })

  // 6. GROUP BY 分组
  .groupBy('alias.id')

  // 7. HAVING 条件（分组后的过滤）
  .having('COUNT(alias.id) > :count', { count: 5 })

  // 8. ORDER BY 排序
  .orderBy('alias.createdAt', 'DESC')

  // 9. LIMIT/OFFSET 分页
  .skip(0)
  .take(10)

  // 10. 执行查询
  .getMany() / .getOne() / .getRawMany() / .getRawOne()
```

### 🔑 关键要点

#### 1. SELECT 必须在 JOIN 之后 ⚠️

```typescript
// ❌ 错误：先 SELECT 后 JOIN
queryBuilder
	.select(["user.id", "user.name"])
	.leftJoinAndSelect("user.profile", "profile") // 会添加 profile 的所有字段
	.getRawOne();
// 结果：返回 user.id, user.name + profile 的所有字段（不符合预期）

// ✅ 正确：先 JOIN 后 SELECT
queryBuilder
	.leftJoinAndSelect("user.profile", "profile")
	.select(["user.id", "user.name", "profile.bio"]) // 覆盖之前的选择
	.getRawOne();
// 结果：只返回指定的字段
```

**原因：** `leftJoinAndSelect` 会自动将关联表的所有字段添加到 SELECT 中。只有在 JOIN 之后执行 SELECT，才能覆盖这些自动添加的字段。

#### 2. JOIN 类型的选择

| JOIN 类型                                  | 何时使用                       | 返回数据         | 适用方法                       |
| ------------------------------------------ | ------------------------------ | ---------------- | ------------------------------ |
| `leftJoin` / `innerJoin`                   | 仅用于条件筛选，不需要关联数据 | 不包含关联实体   | `getRawOne()` / `getRawMany()` |
| `leftJoinAndSelect` / `innerJoinAndSelect` | 需要加载关联数据               | 包含关联实体对象 | `getOne()` / `getMany()`       |

```typescript
// 使用 getRawOne/getRawMany 时（扁平化数据）
queryBuilder
	.leftJoin("user.profile", "profile") // 只用于条件，不加载数据
	.select(["user.id", "profile.bio"])
	.getRawOne(); // 返回：{ user_id: 1, profile_bio: 'xxx' }

// 使用 getOne/getMany 时（实体对象）
queryBuilder
	.leftJoinAndSelect("user.profile", "profile") // 加载关联数据
	.getMany(); // 返回：[{ id: 1, name: 'xxx', profile: { bio: 'xxx' } }]
```

#### 3. 自定义别名

```typescript
// 方式 1: 使用 buildQuery 的 alias 选项（推荐）
const result = await queryBuilder
	.buildQuery({
		alias: "u", // 自定义主表别名
		joins: [{ property: "profile", alias: "p", type: "leftJoinAndSelect" }],
		select: ["u.id", "u.name", "p.bio"], // 使用自定义别名
		conditions: [
			{ field: "u.status", operator: "eq", value: 1 }, // 使用自定义别名
		],
	})
	.getRawOne();

// 方式 2: 默认使用表名作为别名
// 如果不指定 alias，将使用 @Entity() 装饰器中的表名
```

## 使用示例

### 基本查询

```typescript
// 简单的用户列表查询
const users = await userQueryBuilder.findWithRelations({
	conditions: [{ field: "status", operator: "eq", value: 1 }],
	orderBy: [{ field: "created_at", direction: "DESC" }],
});
```

### 关联查询

```typescript
// 查询用户及其Profile信息
const usersWithProfile = await userQueryBuilder.findWithRelations({
	joins: [
		{
			property: "profile", // 关联属性名（对应实体中的属性）
			alias: "profile",
			type: "leftJoinAndSelect",
		},
	],
	conditions: [
		{ field: "status", operator: "eq", value: 1 },
		{ field: "profile.gender", operator: "eq", value: 0 }, // 男性用户
	],
});
```

### 完整功能示例

```typescript
// 包含所有查询功能的完整示例
const result = await userQueryBuilder.findPaginated(
	{
		// 0. 自定义表别名（可选，默认使用表名）
		alias: "u", // 主表别名设为 'u'

		// 1. 关联查询（支持多层级关联）
		joins: [
			{
				property: "profile",
				alias: "p", // 关联表别名
				type: "leftJoinAndSelect", // 加载关联数据
				condition: "p.deleted_at IS NULL", // 可选：自定义 JOIN 条件
			},
			{
				property: "roles",
				alias: "r",
				type: "leftJoinAndSelect",
			},
			{
				property: "r.permissions", // 多层级关联（使用上一级别名）
				alias: "perm",
				type: "leftJoinAndSelect",
			},
		],

		// 2. 字段选择（性能优化）
		// ⚠️ 注意：必须使用完整的 '别名.字段' 格式（TypeORM 原生方式）
		select: [
			"u.id", // 主表字段
			"u.username",
			"u.email",
			"p.avatar", // 关联表字段
			"p.bio",
			"r.id",
			"r.name",
			"perm.code", // 多层级关联字段
		],

		// 3. 查询条件（支持所有操作符）
		// 注意：如果使用了自定义别名，条件中也要使用对应的别名
		conditions: [
			// 等值查询
			{ field: "u.status", operator: "eq", value: 1 }, // 使用别名 'u'

			// 不等查询
			{ field: "u.type", operator: "ne", value: 0 },

			// 范围查询
			{ field: "u.age", operator: "gt", value: 18 }, // 大于
			{ field: "u.age", operator: "gte", value: 18 }, // 大于等于
			{ field: "u.score", operator: "lt", value: 100 }, // 小于
			{ field: "u.score", operator: "lte", value: 100 }, // 小于等于

			// 模糊查询（自动添加 % 通配符）
			{ field: "u.username", operator: "like", value: "admin" },

			// IN 查询
			{ field: "u.role_id", operator: "in", value: [1, 2, 3] },

			// NULL 检查
			{ field: "u.deleted_at", operator: "isNull" },
			{ field: "u.email", operator: "isNotNull" },

			// 关联表条件（使用关联表别名）
			{ field: "p.gender", operator: "eq", value: 1 },
			{ field: "r.code", operator: "ne", value: "guest" },

			// OR 条件（默认是 AND）
			{ field: "p.phone", operator: "like", value: "138", or: true },
			{ field: "p.email", operator: "isNotNull", or: true },
		],

		// 4. 排序（支持多字段）
		orderBy: [
			{ field: "u.created_at", direction: "DESC" }, // 使用别名
			{ field: "u.id", direction: "ASC" },
			{ field: "p.updated_at", direction: "DESC" }, // 关联表排序
		],

		// 5. 分组
		groupBy: ["u.status", "p.gender"], // 使用别名

		// 6. HAVING 条件（用于分组后过滤）
		having: [
			{ field: "COUNT(u.id)", operator: "gt", value: 0 },
			{ field: "AVG(u.score)", operator: "gte", value: 60 },
		],

		// 7. 软删除
		withDeleted: false, // 不包含已软删除的记录
	},
	1, // 页码
	10, // 每页记录数
);

// 返回结果
console.log(result);
// {
//   data: [...],        // 当前页数据
//   total: 100,         // 总记录数
//   page: 1,            // 当前页码
//   pageSize: 10,       // 每页记录数
//   totalPages: 10      // 总页数
// }
```

### 复杂条件查询

```typescript
// 复合条件查询（AND + OR）
const users = await userQueryBuilder.findWithRelations({
	conditions: [
		{ field: "status", operator: "eq", value: 1 }, // AND 状态为激活
		{ field: "created_at", operator: "gt", value: "2024-01-01" }, // AND 创建时间晚于2024年
		{ field: "profile.phone", operator: "like", value: "138" }, // AND 手机号以138开头
		{ field: "profile.email", operator: "isNotNull", or: true }, // OR 邮箱不为空
	],
});
```

### 字段选择优化（SELECT）

**⚠️ 重要：SELECT 字段现在按 TypeORM 原生方式处理**

```typescript
// ✅ 正确：使用完整的 '别名.字段' 格式
const users = await userQueryBuilder
	.buildQuery({
		joins: [{ property: "profile", alias: "profile", type: "leftJoinAndSelect" }],
		select: [
			"users.id", // 主表字段（默认别名是表名）
			"users.username",
			"users.email",
			"profile.bio", // 关联表字段
			"profile.avatar",
		],
		conditions: [{ field: "users.status", operator: "eq", value: 1 }],
	})
	.getMany();

// 🔧 使用自定义别名（更简洁）
const result = await userQueryBuilder
	.buildQuery({
		alias: "u", // 自定义主表别名
		joins: [{ property: "profile", alias: "p", type: "leftJoinAndSelect" }],
		select: [
			"u.id", // 使用自定义别名
			"u.username",
			"p.bio",
			"p.avatar",
		],
		conditions: [{ field: "u.status", operator: "eq", value: 1 }],
	})
	.getMany();

// 🎯 配合 getRawOne/getRawMany 使用（扁平化数据）
const flatData = await userQueryBuilder
	.buildQuery({
		alias: "u",
		joins: [
			{ property: "profile", alias: "p", type: "leftJoin" }, // 注意：使用 leftJoin
		],
		select: [
			"u.id as userId", // 可以使用 AS 重命名
			"u.username as userName",
			"p.bio as userBio",
		],
	})
	.getRawOne();
// 返回：{ userId: 1, userName: 'admin', userBio: 'xxx' }

// ❌ 错误：不使用别名前缀（会报错）
const wrong = await userQueryBuilder
	.buildQuery({
		select: ["id", "name"], // ❌ 错误：缺少表别名
	})
	.getMany();
```

**字段重命名（AS 别名）：**

```typescript
// 支持使用 AS 进行字段重命名
const result = await userQueryBuilder
	.buildQuery({
		alias: "u",
		joins: [
			{ property: "userRoles", alias: "ur", type: "leftJoin" },
			{ property: "ur.role", alias: "r", type: "leftJoin" },
		],
		select: [
			"u.id as userId",
			"u.username as userName",
			"r.id as roleId",
			"r.name as roleName",
		],
	})
	.getRawMany();
// 返回：[{ userId: 1, userName: 'admin', roleId: 1, roleName: 'Admin' }]
```

### 分页查询

```typescript
// 分页查询用户
const result = await userQueryBuilder.findPaginated(
	{
		joins: [{ property: "profile", alias: "profile", type: "leftJoinAndSelect" }],
		conditions: [{ field: "status", operator: "eq", value: 1 }],
		orderBy: [{ field: "created_at", direction: "DESC" }],
	},
	1, // 第1页
	10, // 每页10条
);

// result: {
//   data: [...],      // 当前页数据
//   total: 100,       // 总记录数
//   page: 1,          // 当前页码
//   pageSize: 10,     // 每页记录数
//   totalPages: 10    // 总页数
// }
```

### 统计查询

```typescript
// 统计激活用户数量
const activeUserCount = await userQueryBuilder.count({
	conditions: [{ field: "status", operator: "eq", value: 1 }],
});
```

### 单条记录查询

```typescript
// 根据ID查询用户详情
const user = await userQueryBuilder.findOne({
	joins: [
		{ property: "profile", alias: "profile", type: "leftJoinAndSelect" },
		{ property: "roles", alias: "roles", type: "leftJoinAndSelect" },
	],
	conditions: [{ field: "id", operator: "eq", value: 1 }],
});
```

## 高级用法

### 分组查询

```typescript
// 按状态分组统计用户数量
const userStats = await userQueryBuilder.findWithRelations({
	groupBy: ["status"],
	having: [{ field: "COUNT(id)", operator: "gt", value: 0 }],
});
```

### 多表复杂关联

```typescript
// 查询用户、角色和权限的完整信息（多层级关联）
const usersWithRolesAndPermissions = await userQueryBuilder.findWithRelations({
	joins: [
		{ property: "profile", alias: "profile", type: "leftJoinAndSelect" },
		{ property: "roles", alias: "roles", type: "leftJoinAndSelect" },
		{
			// 多层级关联：使用点号路径 '上一级别名.关联属性'
			property: "roles.permissions",
			alias: "permissions",
			type: "leftJoinAndSelect",
		},
	],
	conditions: [
		{ field: "status", operator: "eq", value: 1 },
		{ field: "roles.code", operator: "ne", value: "super_admin" },
	],
});
```

## 最佳实践

1. **字段命名规范**:

    - **⚠️ 重要变更：现在必须使用完整的 `'别名.字段'` 格式（TypeORM 原生方式）**
    - 主表字段：`'users.id'`、`'users.name'`（使用表名或自定义别名）
    - 关联表字段：`'profile.email'`、`'roles.code'`（使用关联别名）
    - 推荐使用自定义别名简化代码：`alias: 'u'` → `'u.id'`

2. **别名使用建议**:

    - 默认别名：如果不指定 `alias`，使用 `@Entity()` 装饰器中的表名
    - 自定义别名：推荐使用简短的别名（如 `'u'`, `'p'`, `'r'`）提高可读性
    - 保持一致：在 `select`、`conditions`、`orderBy` 等中使用相同的别名

3. **关联属性配置**:

    - 单层关联：`property` 填写实体中的关联属性名，如 `'profile'`、`'roles'`
    - 多层关联：使用点号路径，如 `'roles.permissions'`（从 roles 查询 permissions）
    - TypeORM 会根据实体装饰器（`@ManyToOne`, `@OneToMany` 等）自动处理关联关系
    - 如需筛选关联数据，请使用 `conditions` 参数

4. **关联类型选择**:

    - 需要关联数据（实体对象）：使用 `leftJoinAndSelect` + `getMany()`
    - 需要扁平化数据：使用 `leftJoin` + `select` + `getRawMany()`
    - 仅用于条件过滤：使用 `leftJoin` 或 `innerJoin`

5. **SELECT 与 JOIN 的顺序**:

    - ⚠️ **关键：在我们的实现中，SELECT 会在 JOIN 之后执行**
    - 这样可以覆盖 `joinAndSelect` 自动添加的字段
    - 如果使用了 `joinAndSelect`，建议在 `select` 中明确指定需要的字段

6. **条件组合**: 合理使用 `or` 参数来构建复杂的查询逻辑

7. **性能优化**:

    - 使用 `select` 参数只查询需要的字段，避免查询所有字段
    - 条件会自动按索引优化顺序排序（等值查询优先）
    - 只在需要时使用 `leftJoinAndSelect`，避免不必要的关联数据加载
    - 使用自定义别名可以使 SQL 更简洁

8. **分页处理**: 对于大数据集，始终使用分页查询

9. **查询构建顺序**: 框架已按最优顺序自动处理：
    - withDeleted → JOIN → SELECT → WHERE → GROUP BY → HAVING → ORDER BY → LIMIT/OFFSET

## 条件筛选说明

### 使用 conditions 参数进行筛选

Query Builder 使用 `conditions` 参数来添加 WHERE 子句条件，支持对主表和关联表的字段进行筛选。

```typescript
// ✅ 筛选关联数据
const activeUsers = await userQueryBuilder.findWithRelations({
	joins: [{ property: "profile", alias: "profile", type: "leftJoinAndSelect" }],
	conditions: [
		{ field: "status", operator: "eq", value: 1 }, // 主表条件
		{ field: "profile.status", operator: "eq", value: 1 }, // 关联表条件
	],
});
// 结果：只返回满足条件的用户及其 profile
```

### 重要提示

-   **JOIN 自动处理**：所有 JOIN 操作基于实体装饰器自动处理，无需手动指定关联条件
-   **条件筛选**：使用 `conditions` 参数添加 WHERE 子句，过滤最终返回的记录
-   **LEFT JOIN 特性**：如果在 conditions 中添加了关联表条件，会过滤掉不满足条件的主表记录

### ⚠️ 复杂条件限制（AND/OR 优先级）

当使用 `or: true` 时，需要注意 **SQL 运算符优先级**（AND > OR）：

```typescript
// ❌ 可能不符合预期的写法
conditions: [
	{ field: "status", operator: "eq", value: 1 }, // 条件1: AND
	{ field: "age", operator: "gt", value: 18 }, // 条件2: AND
	{ field: "vip", operator: "eq", value: true, or: true }, // 条件3: OR
];

// 生成 SQL:
// WHERE status = 1 AND age > 18 OR vip = true
//
// 由于运算符优先级，等价于:
// WHERE status = 1 AND (age > 18 OR vip = true)
//
// 而不是你可能期望的:
// WHERE (status = 1 AND age > 18) OR vip = true
```

### 解决方案：使用 buildQuery() 手动添加复杂条件

对于需要精确控制括号的复杂条件，使用 `buildQuery()` 获取 QueryBuilder 后手动处理：

```typescript
import { Brackets } from "typeorm";

// ✅ 方案 1: (条件1 AND 条件2) OR 条件3
const qb = userQueryBuilder.buildQuery({
	joins: [{ property: "profile", alias: "profile", type: "leftJoinAndSelect" }],
});

qb.andWhere(
	new Brackets((qb) => {
		qb.where("user.status = :status", { status: 1 }).andWhere("user.age > :age", { age: 18 });
	}),
).orWhere("user.vip = :vip", { vip: true });

const users = await qb.getMany();

// ✅ 方案 2: 条件1 OR (条件2 AND 条件3)
const qb2 = userQueryBuilder.buildQuery({
	joins: [{ property: "profile", alias: "profile", type: "leftJoinAndSelect" }],
});

qb2.where("user.status = :status", { status: 1 }).orWhere(
	new Brackets((qb) => {
		qb.where("user.age > :age", { age: 18 }).andWhere("user.vip = :vip", {
			vip: true,
		});
	}),
);

const users2 = await qb2.getMany();

// ✅ 方案 3: 复杂的多层嵌套
const qb3 = userQueryBuilder.buildQuery({});

qb3.where(
	new Brackets((qb) => {
		qb.where("user.status = :status", { status: 1 }).orWhere("user.vip = :vip", { vip: true });
	}),
).andWhere(
	new Brackets((qb) => {
		qb.where("user.age > :minAge", { minAge: 18 }).andWhere("user.age < :maxAge", {
			maxAge: 60,
		});
	}),
);

const users3 = await qb3.getMany();
// SQL: WHERE (status = 1 OR vip = true) AND (age > 18 AND age < 60)
```

### 示例对比

假设数据：

-   users: `{ id: 1, name: '张三' }`, `{ id: 2, name: '李四' }`
-   profiles: `{ user_id: 1, status: 1 }`, `{ user_id: 2, status: 0 }`

```typescript
// 场景 1: 不添加条件，返回所有用户及其 profile
const allUsers = await userQueryBuilder.findWithRelations({
	joins: [{ property: "profile", alias: "profile", type: "leftJoinAndSelect" }],
});
// 结果：张三(profile.status=1) + 李四(profile.status=0)

// 场景 2: 添加 WHERE 条件，只返回激活用户
const activeUsers = await userQueryBuilder.findWithRelations({
	joins: [{ property: "profile", alias: "profile", type: "leftJoinAndSelect" }],
	conditions: [{ field: "profile.status", operator: "eq", value: 1 }],
});
// 结果：只有张三(profile.status=1)
```

## 操作符速查表

### 支持的查询操作符

| 操作符      | SQL 操作      | 说明                   | 示例                                                      |
| ----------- | ------------- | ---------------------- | --------------------------------------------------------- |
| `eq`        | `=`           | 等于                   | `{ field: 'status', operator: 'eq', value: 1 }`           |
| `ne`        | `!=`          | 不等于                 | `{ field: 'type', operator: 'ne', value: 0 }`             |
| `gt`        | `>`           | 大于                   | `{ field: 'age', operator: 'gt', value: 18 }`             |
| `gte`       | `>=`          | 大于等于               | `{ field: 'age', operator: 'gte', value: 18 }`            |
| `lt`        | `<`           | 小于                   | `{ field: 'score', operator: 'lt', value: 100 }`          |
| `lte`       | `<=`          | 小于等于               | `{ field: 'score', operator: 'lte', value: 100 }`         |
| `like`      | `LIKE`        | 模糊查询（自动添加 %） | `{ field: 'username', operator: 'like', value: 'admin' }` |
| `in`        | `IN`          | 在指定值列表中         | `{ field: 'id', operator: 'in', value: [1, 2, 3] }`       |
| `isNull`    | `IS NULL`     | 为空                   | `{ field: 'deleted_at', operator: 'isNull' }`             |
| `isNotNull` | `IS NOT NULL` | 不为空                 | `{ field: 'email', operator: 'isNotNull' }`               |

### JOIN 类型说明

| 类型                 | 说明         | 是否加载关联数据 | 使用场景                           |
| -------------------- | ------------ | ---------------- | ---------------------------------- |
| `leftJoin`           | 左连接       | ❌ 否            | 仅用于条件筛选，不需要关联数据     |
| `innerJoin`          | 内连接       | ❌ 否            | 仅用于条件筛选，只返回有关联的记录 |
| `leftJoinAndSelect`  | 左连接并选择 | ✅ 是            | 需要加载关联数据，允许关联为空     |
| `innerJoinAndSelect` | 内连接并选择 | ✅ 是            | 需要加载关联数据，必须有关联       |

### 查询方法对比

| 方法                  | 返回类型                  | 说明             | 使用场景               |
| --------------------- | ------------------------- | ---------------- | ---------------------- |
| `findWithRelations()` | `T[]`                     | 返回所有匹配记录 | 查询列表（不分页）     |
| `findOne()`           | `T \| null`               | 返回第一条记录   | 查询详情、根据 ID 查询 |
| `findPaginated()`     | `PaginatedQueryResult<T>` | 返回分页结果     | 列表分页查询           |
| `count()`             | `number`                  | 返回记录总数     | 统计数量               |
| `buildQuery()`        | `SelectQueryBuilder<T>`   | 返回查询构建器   | 需要进一步自定义查询   |

### 条件优先级（自动优化）

查询条件会按照以下优先级自动排序，以提升查询性能：

1. **等值查询**（`eq`, `in`）- 优先级最高，索引利用最佳
2. **范围查询**（`gt`, `gte`, `lt`, `lte`）- 索引利用良好
3. **模糊查询**（`like`）- 索引利用一般
4. **NULL 检查**（`isNull`, `isNotNull`）- 索引利用一般
5. **不等查询**（`ne`）- 索引利用较差

同一优先级内，AND 条件优先于 OR 条件。

## 服务集成

在 NestJS 服务中集成 QueryBuilder：

```typescript
@Injectable()
export class UserService {
	private userQueryBuilder: QueryBuilderHelper<User>;

	constructor(
		@InjectRepository(User)
		private readonly userRepository: Repository<User>,
		private readonly queryBuilderFactory: QueryBuilderFactory,
	) {
		this.userQueryBuilder = this.queryBuilderFactory.createFromRepository(this.userRepository);
	}

	// 示例 1: 基本分页查询
	async findUsers(query: FindAllUserDto) {
		return await this.userQueryBuilder.findPaginated(
			{
				alias: "u", // 使用自定义别名
				joins: [
					{
						property: "profile",
						alias: "p",
						type: "leftJoinAndSelect",
					},
				],
				select: ["u.id", "u.username", "u.email", "p.bio", "p.avatar"],
				conditions: [{ field: "u.status", operator: "eq", value: query.status }],
				orderBy: [{ field: "u.created_at", direction: "DESC" }],
			},
			query.page,
			query.pageSize,
		);
	}

	// 示例 2: 使用 getRawOne 获取扁平化数据
	async findUserDetail(id: string) {
		return await this.userQueryBuilder
			.buildQuery({
				alias: "u",
				joins: [
					{ property: "userRoles", alias: "ur", type: "leftJoin" },
					{ property: "ur.role", alias: "r", type: "leftJoin" },
					{ property: "profile", alias: "p", type: "leftJoin" },
				],
				select: [
					"u.id as userId",
					"u.username as userName",
					"u.email as userEmail",
					"r.id as roleId",
					"r.name as roleName",
					"p.bio as userBio",
				],
				conditions: [
					{ field: "u.id", operator: "eq", value: id },
					{ field: "u.isActive", operator: "eq", value: true },
				],
			})
			.getRawOne();
	}
}
```

## TypeORM 查询书写完整指南

### 📚 核心概念总结

#### 1. 查询构建顺序（重要性：⭐⭐⭐⭐⭐）

```typescript
// 标准顺序（我们的 QueryBuilder 已自动处理）
const result = await queryBuilder.buildQuery({
  // ① 别名定义
  alias: 'u',

  // ② 软删除
  withDeleted: false,

  // ③ JOIN（先执行）
  joins: [...],

  // ④ SELECT（后执行，覆盖 joinAndSelect）
  select: [...],

  // ⑤ WHERE 条件（按索引优化顺序）
  conditions: [...],

  // ⑥ GROUP BY
  groupBy: [...],

  // ⑦ HAVING
  having: [...],

  // ⑧ ORDER BY
  orderBy: [...]
})
.skip(0)    // ⑨ OFFSET
.take(10)   // ⑩ LIMIT
.getMany(); // ⑪ 执行
```

#### 2. SELECT 与 JOIN 的关键关系

```typescript
// 场景 1: 使用 getMany()，需要实体对象
{
  joins: [
    { property: 'profile', alias: 'p', type: 'leftJoinAndSelect' }
  ],
  select: [
    'u.id',
    'u.name',
    'p.bio'  // 明确指定需要的关联字段
  ]
}
// SELECT 会覆盖 joinAndSelect 自动添加的所有字段

// 场景 2: 使用 getRawOne/getRawMany()，需要扁平化数据
{
  joins: [
    { property: 'profile', alias: 'p', type: 'leftJoin' }  // 不用 AndSelect
  ],
  select: [
    'u.id as userId',
    'u.name as userName',
    'p.bio as userBio'
  ]
}
// 返回扁平对象：{ userId: 1, userName: 'xxx', userBio: 'xxx' }
```

#### 3. 别名使用规范

| 场景       | 别名设置             | 字段引用     | 示例                                  |
| ---------- | -------------------- | ------------ | ------------------------------------- |
| 使用表名   | 不设置 `alias`       | `'users.id'` | `@Entity('users')` → 别名为 `'users'` |
| 自定义别名 | `alias: 'u'`         | `'u.id'`     | 更简洁，推荐使用                      |
| 关联表别名 | `joins[].alias: 'p'` | `'p.bio'`    | 在 join 配置中指定                    |

#### 4. 条件优化（自动处理）

我们的 QueryBuilder 会自动按以下优先级排序条件：

```typescript
// 优先级（数字越小越优先）
1. eq, in        // 等值查询 - 索引利用最佳
2. gt, gte, lt, lte  // 范围查询 - 索引利用良好
3. like, isNull, isNotNull  // 模糊/NULL查询 - 索引利用一般
4. ne            // 不等查询 - 索引利用较差

// 同一优先级内：AND 条件优先于 OR 条件
```

### 🎯 实战示例对比

#### 示例 1: 简单列表查询

```typescript
// ✅ 推荐写法
const users = await userQueryBuilder.findPaginated(
	{
		alias: "u",
		select: ["u.id", "u.username", "u.email", "u.createdAt"],
		conditions: [{ field: "u.status", operator: "eq", value: 1 }],
		orderBy: [{ field: "u.createdAt", direction: "DESC" }],
	},
	1,
	10,
);
```

#### 示例 2: 带关联的详情查询

```typescript
// ✅ 方式 1: 使用 getMany()，返回实体对象
const user = await userQueryBuilder.findOne({
	alias: "u",
	joins: [
		{ property: "profile", alias: "p", type: "leftJoinAndSelect" },
		{ property: "roles", alias: "r", type: "leftJoinAndSelect" },
	],
	conditions: [{ field: "u.id", operator: "eq", value: userId }],
});
// 返回: { id: 1, name: 'xxx', profile: {...}, roles: [...] }

// ✅ 方式 2: 使用 getRawOne()，返回扁平数据
const userData = await userQueryBuilder
	.buildQuery({
		alias: "u",
		joins: [
			{ property: "profile", alias: "p", type: "leftJoin" },
			{ property: "roles", alias: "r", type: "leftJoin" },
		],
		select: ["u.id as userId", "u.name as userName", "p.bio as userBio", "r.name as roleName"],
		conditions: [{ field: "u.id", operator: "eq", value: userId }],
	})
	.getRawOne();
// 返回: { userId: 1, userName: 'xxx', userBio: 'xxx', roleName: 'Admin' }
```

#### 示例 3: 复杂的多表关联

```typescript
// ✅ 多层级关联查询
const result = await userQueryBuilder.findPaginated(
	{
		alias: "u",
		joins: [
			{ property: "profile", alias: "p", type: "leftJoinAndSelect" },
			{ property: "userRoles", alias: "ur", type: "leftJoinAndSelect" },
			{ property: "ur.role", alias: "r", type: "leftJoinAndSelect" },
			{ property: "r.permissions", alias: "perm", type: "leftJoinAndSelect" },
		],
		select: ["u.id", "u.username", "p.avatar", "r.id", "r.name", "perm.code"],
		conditions: [
			{ field: "u.status", operator: "eq", value: 1 },
			{ field: "r.code", operator: "ne", value: "guest" },
		],
		orderBy: [{ field: "u.createdAt", direction: "DESC" }],
	},
	1,
	20,
);
```

### ⚠️ 常见错误与解决

#### 错误 1: SELECT 字段缺少别名

```typescript
// ❌ 错误
select: ["id", "name"]; // 缺少表别名

// ✅ 正确
select: ["u.id", "u.name"]; // 或 ['users.id', 'users.name']
```

#### 错误 2: 别名不一致

```typescript
// ❌ 错误
{
  alias: 'u',
  select: ['users.id'],  // 使用了 'users' 而不是 'u'
  conditions: [{ field: 'user.status', operator: 'eq', value: 1 }]  // 使用了 'user'
}

// ✅ 正确
{
  alias: 'u',
  select: ['u.id'],
  conditions: [{ field: 'u.status', operator: 'eq', value: 1 }]
}
```

#### 错误 3: JOIN 类型选择不当

```typescript
// ❌ 使用 joinAndSelect 但想要扁平数据
{
  joins: [
    { property: 'profile', alias: 'p', type: 'leftJoinAndSelect' }  // ❌
  ],
  select: ['u.id as userId', 'p.bio as userBio']
}
// getRawOne() 可能返回意外的结果

// ✅ 正确
{
  joins: [
    { property: 'profile', alias: 'p', type: 'leftJoin' }  // ✅ 不用 AndSelect
  ],
  select: ['u.id as userId', 'p.bio as userBio']
}
```

### 📋 快速参考

```typescript
// 完整的查询模板
const result = await queryBuilder.buildQuery({
  alias: 'mainAlias',                    // 主表别名
  withDeleted: false,                    // 是否包含软删除

  joins: [                               // JOIN 配置
    {
      property: 'relationName',          // 关联属性名
      alias: 'relAlias',                 // 关联表别名
      type: 'leftJoinAndSelect',         // JOIN 类型
      condition: 'optional condition'    // 可选的自定义条件
    }
  ],

  select: [                              // SELECT 字段
    'mainAlias.field',                   // 主表字段
    'relAlias.field as aliasName'        // 关联字段（可重命名）
  ],

  conditions: [                          // WHERE 条件
    {
      field: 'mainAlias.field',          // 字段名（含别名）
      operator: 'eq',                    // 操作符
      value: 'value',                    // 值
      or: false                          // 是否为 OR 条件
    }
  ],

  groupBy: ['mainAlias.field'],          // GROUP BY
  having: [...],                         // HAVING 条件
  orderBy: [                             // ORDER BY
    { field: 'mainAlias.field', direction: 'DESC' }
  ]
})
.skip(0)                                 // OFFSET
.take(10)                                // LIMIT
.getMany();                              // 执行查询
```

---

## 版本更新说明

### v2.0 主要变更

1. **SELECT 字段处理方式变更**

    - 旧版：自动添加表别名前缀
    - 新版：按 TypeORM 原生方式，需要手动指定完整的 `'别名.字段'` 格式

2. **支持自定义表别名**

    - 新增 `alias` 选项，可以自定义主表别名
    - 默认使用 `@Entity()` 装饰器中的表名

3. **查询构建顺序优化**

    - SELECT 处理移到 JOIN 之后，确保可以覆盖 `joinAndSelect` 的字段

4. **性能优化**
    - 条件自动按索引优先级排序
    - COUNT 查询正确使用自定义别名
