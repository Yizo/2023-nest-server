# Query Builder 使用指南

## 概述

Query Builder 是基于 TypeORM 的统一查询构建工具，提供简洁易用的 API 来构建复杂的数据库查询。

## 使用示例

### 基本查询

```typescript
// 简单的用户列表查询
const users = await userQueryBuilder.findWithRelations({
  conditions: [{ field: 'status', operator: 'eq', value: 1 }],
  orderBy: [{ field: 'created_at', direction: 'DESC' }],
});
```

### 关联查询

```typescript
// 查询用户及其Profile信息
const usersWithProfile = await userQueryBuilder.findWithRelations({
  joins: [
    {
      property: 'profile', // 关联属性名（对应实体中的属性）
      alias: 'profile',
      type: 'leftJoinAndSelect',
    },
  ],
  conditions: [
    { field: 'status', operator: 'eq', value: 1 },
    { field: 'profile.gender', operator: 'eq', value: 0 }, // 男性用户
  ],
});
```

### 完整功能示例

```typescript
// 包含所有查询功能的完整示例
const result = await userQueryBuilder.findPaginated(
  {
    // 1. 关联查询（支持多层级关联）
    joins: [
      {
        property: 'profile',
        alias: 'profile',
        type: 'leftJoinAndSelect', // 加载关联数据
        condition: 'profile.deleted_at IS NULL', // 可选：自定义 JOIN 条件
      },
      {
        property: 'roles',
        alias: 'roles',
        type: 'leftJoinAndSelect',
      },
      {
        property: 'roles.permissions', // 多层级关联
        alias: 'permissions',
        type: 'leftJoinAndSelect',
      },
    ],

    // 2. 字段选择（性能优化）
    select: ['id', 'username', 'email', 'profile.avatar', 'roles.name'],

    // 3. 查询条件（支持所有操作符）
    conditions: [
      // 等值查询
      { field: 'status', operator: 'eq', value: 1 },

      // 不等查询
      { field: 'type', operator: 'ne', value: 0 },

      // 范围查询
      { field: 'age', operator: 'gt', value: 18 }, // 大于
      { field: 'age', operator: 'gte', value: 18 }, // 大于等于
      { field: 'score', operator: 'lt', value: 100 }, // 小于
      { field: 'score', operator: 'lte', value: 100 }, // 小于等于

      // 模糊查询（自动添加 % 通配符）
      { field: 'username', operator: 'like', value: 'admin' },

      // IN 查询
      { field: 'role_id', operator: 'in', value: [1, 2, 3] },

      // NULL 检查
      { field: 'deleted_at', operator: 'isNull' },
      { field: 'email', operator: 'isNotNull' },

      // 关联表条件
      { field: 'profile.gender', operator: 'eq', value: 1 },
      { field: 'roles.code', operator: 'ne', value: 'guest' },

      // OR 条件（默认是 AND）
      { field: 'profile.phone', operator: 'like', value: '138', or: true },
      { field: 'profile.email', operator: 'isNotNull', or: true },
    ],

    // 4. 排序（支持多字段）
    orderBy: [
      { field: 'created_at', direction: 'DESC' },
      { field: 'id', direction: 'ASC' },
      { field: 'profile.updated_at', direction: 'DESC' }, // 关联表排序
    ],

    // 5. 分组
    groupBy: ['status', 'profile.gender'],

    // 6. HAVING 条件（用于分组后过滤）
    having: [
      { field: 'COUNT(id)', operator: 'gt', value: 0 },
      { field: 'AVG(score)', operator: 'gte', value: 60 },
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
    { field: 'status', operator: 'eq', value: 1 }, // AND 状态为激活
    { field: 'created_at', operator: 'gt', value: '2024-01-01' }, // AND 创建时间晚于2024年
    { field: 'profile.phone', operator: 'like', value: '138' }, // AND 手机号以138开头
    { field: 'profile.email', operator: 'isNotNull', or: true }, // OR 邮箱不为空
  ],
});
```

### 字段选择优化

```typescript
// 只查询需要的字段以提高性能
const users = await userQueryBuilder.findWithRelations({
  select: ['id', 'name', 'profile.email'], // 只选择需要的字段
  joins: [{ property: 'profile', alias: 'profile', type: 'leftJoinAndSelect' }],
  conditions: [{ field: 'status', operator: 'eq', value: 1 }],
});
```

### 分页查询

```typescript
// 分页查询用户
const result = await userQueryBuilder.findPaginated(
  {
    joins: [
      { property: 'profile', alias: 'profile', type: 'leftJoinAndSelect' },
    ],
    conditions: [{ field: 'status', operator: 'eq', value: 1 }],
    orderBy: [{ field: 'created_at', direction: 'DESC' }],
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
  conditions: [{ field: 'status', operator: 'eq', value: 1 }],
});
```

### 单条记录查询

```typescript
// 根据ID查询用户详情
const user = await userQueryBuilder.findOne({
  joins: [
    { property: 'profile', alias: 'profile', type: 'leftJoinAndSelect' },
    { property: 'roles', alias: 'roles', type: 'leftJoinAndSelect' },
  ],
  conditions: [{ field: 'id', operator: 'eq', value: 1 }],
});
```

## 高级用法

### 分组查询

```typescript
// 按状态分组统计用户数量
const userStats = await userQueryBuilder.findWithRelations({
  groupBy: ['status'],
  having: [{ field: 'COUNT(id)', operator: 'gt', value: 0 }],
});
```

### 多表复杂关联

```typescript
// 查询用户、角色和权限的完整信息（多层级关联）
const usersWithRolesAndPermissions = await userQueryBuilder.findWithRelations({
  joins: [
    { property: 'profile', alias: 'profile', type: 'leftJoinAndSelect' },
    { property: 'roles', alias: 'roles', type: 'leftJoinAndSelect' },
    {
      // 多层级关联：使用点号路径 '上一级别名.关联属性'
      property: 'roles.permissions',
      alias: 'permissions',
      type: 'leftJoinAndSelect',
    },
  ],
  conditions: [
    { field: 'status', operator: 'eq', value: 1 },
    { field: 'roles.code', operator: 'ne', value: 'super_admin' },
  ],
});
```

## 最佳实践

1. **字段命名规范**:

   - 主表字段：直接使用字段名，如 `'name'`、`'status'`（会自动添加表别名）
   - 关联表字段：使用点号路径，如 `'profile.email'`、`'roles.code'`

2. **关联属性配置**:

   - 单层关联：`property` 填写实体中的关联属性名，如 `'profile'`、`'roles'`
   - 多层关联：使用点号路径，如 `'roles.permissions'`（从 roles 查询 permissions）
   - TypeORM 会根据实体装饰器（`@ManyToOne`, `@OneToMany` 等）自动处理关联关系
   - 如需筛选关联数据，请使用 `conditions` 参数

3. **关联类型选择**:

   - 需要关联数据：使用 `leftJoinAndSelect` 或 `innerJoinAndSelect`
   - 仅用于条件过滤：使用 `leftJoin` 或 `innerJoin`

4. **条件组合**: 合理使用 `or` 参数来构建复杂的查询逻辑

5. **性能优化**:

   - 使用 `select` 参数只查询需要的字段，避免查询所有字段
   - 条件会自动按索引优化顺序排序（等值查询优先）
   - 只在需要时使用 `leftJoinAndSelect`，避免不必要的关联数据加载

6. **分页处理**: 对于大数据集，始终使用分页查询

7. **查询顺序**: 框架已按 MySQL 执行顺序优化：FROM → WHERE → GROUP BY → HAVING → ORDER BY

## 条件筛选说明

### 使用 conditions 参数进行筛选

Query Builder 使用 `conditions` 参数来添加 WHERE 子句条件，支持对主表和关联表的字段进行筛选。

```typescript
// ✅ 筛选关联数据
const activeUsers = await userQueryBuilder.findWithRelations({
  joins: [{ property: 'profile', alias: 'profile', type: 'leftJoinAndSelect' }],
  conditions: [
    { field: 'status', operator: 'eq', value: 1 }, // 主表条件
    { field: 'profile.status', operator: 'eq', value: 1 }, // 关联表条件
  ],
});
// 结果：只返回满足条件的用户及其 profile
```

### 重要提示

- **JOIN 自动处理**：所有 JOIN 操作基于实体装饰器自动处理，无需手动指定关联条件
- **条件筛选**：使用 `conditions` 参数添加 WHERE 子句，过滤最终返回的记录
- **LEFT JOIN 特性**：如果在 conditions 中添加了关联表条件，会过滤掉不满足条件的主表记录

### ⚠️ 复杂条件限制（AND/OR 优先级）

当使用 `or: true` 时，需要注意 **SQL 运算符优先级**（AND > OR）：

```typescript
// ❌ 可能不符合预期的写法
conditions: [
  { field: 'status', operator: 'eq', value: 1 }, // 条件1: AND
  { field: 'age', operator: 'gt', value: 18 }, // 条件2: AND
  { field: 'vip', operator: 'eq', value: true, or: true }, // 条件3: OR
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
import { Brackets } from 'typeorm';

// ✅ 方案 1: (条件1 AND 条件2) OR 条件3
const qb = userQueryBuilder.buildQuery({
  joins: [{ property: 'profile', alias: 'profile', type: 'leftJoinAndSelect' }],
});

qb.andWhere(
  new Brackets((qb) => {
    qb.where('user.status = :status', { status: 1 }).andWhere(
      'user.age > :age',
      { age: 18 },
    );
  }),
).orWhere('user.vip = :vip', { vip: true });

const users = await qb.getMany();

// ✅ 方案 2: 条件1 OR (条件2 AND 条件3)
const qb2 = userQueryBuilder.buildQuery({
  joins: [{ property: 'profile', alias: 'profile', type: 'leftJoinAndSelect' }],
});

qb2.where('user.status = :status', { status: 1 }).orWhere(
  new Brackets((qb) => {
    qb.where('user.age > :age', { age: 18 }).andWhere('user.vip = :vip', {
      vip: true,
    });
  }),
);

const users2 = await qb2.getMany();

// ✅ 方案 3: 复杂的多层嵌套
const qb3 = userQueryBuilder.buildQuery({});

qb3
  .where(
    new Brackets((qb) => {
      qb.where('user.status = :status', { status: 1 }).orWhere(
        'user.vip = :vip',
        { vip: true },
      );
    }),
  )
  .andWhere(
    new Brackets((qb) => {
      qb.where('user.age > :minAge', { minAge: 18 }).andWhere(
        'user.age < :maxAge',
        { maxAge: 60 },
      );
    }),
  );

const users3 = await qb3.getMany();
// SQL: WHERE (status = 1 OR vip = true) AND (age > 18 AND age < 60)
```

### 示例对比

假设数据：

- users: `{ id: 1, name: '张三' }`, `{ id: 2, name: '李四' }`
- profiles: `{ user_id: 1, status: 1 }`, `{ user_id: 2, status: 0 }`

```typescript
// 场景 1: 不添加条件，返回所有用户及其 profile
const allUsers = await userQueryBuilder.findWithRelations({
  joins: [{ property: 'profile', alias: 'profile', type: 'leftJoinAndSelect' }],
});
// 结果：张三(profile.status=1) + 李四(profile.status=0)

// 场景 2: 添加 WHERE 条件，只返回激活用户
const activeUsers = await userQueryBuilder.findWithRelations({
  joins: [{ property: 'profile', alias: 'profile', type: 'leftJoinAndSelect' }],
  conditions: [{ field: 'profile.status', operator: 'eq', value: 1 }],
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
    this.userQueryBuilder = this.queryBuilderFactory.createFromRepository(
      this.userRepository,
    );
  }

  async findUsers(query: FindAllUserDto) {
    return await this.userQueryBuilder.findPaginated(
      {
        joins: [
          {
            property: 'profile', // 实体中的关联属性名
            alias: 'profile',
            type: 'leftJoinAndSelect',
          },
        ],
        conditions: [{ field: 'status', operator: 'eq', value: query.status }],
        orderBy: [{ field: 'created_at', direction: 'DESC' }],
      },
      query.page,
      query.pageSize,
    );
  }
}
```
