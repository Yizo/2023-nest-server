# 请使用 NestJS + TypeORM + MySQL 实现一个后端项目的核心部分。

## 模块结构

> 需要实现以下四个核心模块的实体和服务层

- User - 用户核心模块
- Profile - 用户资料模块（与 User 一对一关系）
- Logs - 操作日志模块（与 User 一对多关系）
- Role - 角色权限模块（与 User 多对多关系）

## 数据库关系约束

- 禁止使用 TypeORM 的 @OneToOne、@OneToMany、@ManyToMany 等装饰器。
- 禁止使用 TypeORM 的 cascade、relations、orphanedRowAction 等任何自动化特性。
- 必须通过外键字段手动维护关联（如 userId, profileId）, 必须在业务中显式维护数据一致性与引用关系
- 多对多关系必须通过中间表/联结实体实现

## CRUD 复杂度要求

### 查询必须包含

- 排序（ORDER BY）
- 分页（LIMIT, OFFSET）
- 条件查询（WHERE）
- 模糊查询（LIKE）
- 多表联合查询（JOIN）
- 注意: 以上查询条件都是可选的, 可以组合使用

### 写操作必须包含

- 事务处理（QueryRunner 或 DataSource.transaction）
- 自动维护时间戳字段：created_at、updated_at、deleted_at
- 软删除机制（deleted_at 标记）
- 写操作前执行存在性与约束校验
- 手动实现级联操作（如删除用户需同步软删 Profile 与 Logs）
- 数据一致性保障（更新 User 时同步更新 Profile）
- 每次重要写操作必须写入 logs 表记录行为日志

### 业务校验要求

- 所有关联实体操作前必须执行“存在性验证”与“冲突检测”。
- 新增与更新操作必须执行字段合法性与唯一性校验。

## 代码注释规范

### 实体类注释要求

- 每个字段必须有清晰注释，说明业务含义与用途。
- 若字段与其他表存在关联，必须注明关联关系及维护逻辑。

### 服务层注释要求

> 每个方法必须使用 完整的 JSDoc 注释，包含以下内容：

- 方法功能说明
- 参数说明（类型 + 含义）
- 返回值类型与结构
- 涉及的表或关联逻辑

### 查询器注释

1. 说明查询器的整体作用与使用场景
2. 对查询器中的每个函数进行注释，包括:

- 函数功能
- 参数说明
- 返回数据结构
- 核心业务意图或优化思路

## 输出要求

- 输出完整的 TypeScript 源代码。
- 仅包含 entity 与 service 文件内容。
- 结构清晰，可直接放入 NestJS 项目使用。
- 每个文件之间请用清晰的注释块分隔（如 // ===== User Entity =====）。
- 文件命名与类名遵循 NestJS 命名规范（如 user.entity.ts, user.service.ts）。

## 代码风格建议

1. 使用 TypeORM Repository 模式 进行数据操作。
2. 所有查询逻辑应基于 QueryBuilder 实现，并配有详细注释。

3. 保持命名语义化，例如：

- findUserWithRoles()
- softDeleteUser()
- restoreUserProfile()

4. 遵循企业级代码规范，重点关注：

- 可读性
- 可维护性
- 模块解耦
- 数据一致性与安全性
