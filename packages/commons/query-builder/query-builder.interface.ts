import { SelectQueryBuilder, ObjectLiteral } from "typeorm";

/**
 * 查询条件接口 - 定义单个查询条件的结构
 * 用于构建 WHERE 子句中的条件表达式
 */
export interface QueryCondition {
	/** 查询字段名，支持点号分隔的关联字段，如 'user.name' 或 'profile.email' */
	field: string;

	/**
	 * 查询操作符
	 * - 'eq': 等于 (=)
	 * - 'ne': 不等于 (!=)
	 * - 'gt': 大于 (>)
	 * - 'gte': 大于等于 (>=)
	 * - 'lt': 小于 (<)
	 * - 'lte': 小于等于 (<=)
	 * - 'like': 模糊匹配 (LIKE)，自动添加 % 通配符
	 * - 'in': 在指定值列表中 (IN)
	 * - 'isNull': 为空 (IS NULL)
	 * - 'isNotNull': 不为空 (IS NOT NULL)
	 */
	operator: "eq" | "ne" | "gt" | "gte" | "lt" | "lte" | "like" | "in" | "isNull" | "isNotNull";

	/** 查询值，对于 'isNull' 和 'isNotNull' 操作符不需要此参数 */
	value?: any;

	/**
	 * 是否为OR条件，默认为false表示AND条件
	 *
	 * ⚠️ 重要说明：
	 * 由于 SQL 运算符优先级（AND > OR），使用 or: true 时需要注意：
	 *
	 * 示例：
	 * ```typescript
	 * conditions: [
	 *   { field: 'status', operator: 'eq', value: 1 },        // 条件1
	 *   { field: 'age', operator: 'gt', value: 18 },          // 条件2
	 *   { field: 'vip', operator: 'eq', value: true, or: true } // 条件3 (OR)
	 * ]
	 * ```
	 *
	 * 生成 SQL: `WHERE status = 1 AND age > 18 OR vip = true`
	 * 等价于: `WHERE status = 1 AND (age > 18 OR vip = true)`
	 *
	 * 如果需要 `(status = 1 AND age > 18) OR vip = true`，
	 * 建议使用 buildQuery() 方法获取 QueryBuilder 后手动添加条件：
	 *
	 * ```typescript
	 * const qb = queryBuilder.buildQuery(options);
	 * qb.andWhere(
	 *   new Brackets((qb) => {
	 *     qb.where('status = :status', { status: 1 })
	 *       .andWhere('age > :age', { age: 18 });
	 *   })
	 * ).orWhere('vip = :vip', { vip: true });
	 * ```
	 */
	or?: boolean;
}

/**
 * 关联关系接口 - 定义表关联的配置
 * 用于构建 JOIN 子句，支持多种关联类型
 */
export interface JoinRelation {
	/**
	 * 关联属性名，对应实体中定义的关联属性
	 *
	 * 单层关联示例：
	 * - 'profile' - 查询用户的个人资料（user.profile）
	 * - 'roles' - 查询用户的角色（user.roles）
	 *
	 * 多层关联示例（使用点号路径）：
	 * - 'roles.permissions' - 查询角色的权限（从已关联的 roles 继续查询）
	 * - 'department.manager' - 查询部门的管理者
	 *
	 * 注意：这里填写的是实体类中 @ManyToOne、@OneToMany 等装饰器标记的属性名
	 */
	property: string;

	/**
	 * 关联表的别名，用于在查询中引用关联表的字段
	 * 示例：'profile'、'roles'、'permissions'
	 */
	alias: string;

	/**
	 * 关联类型
	 * - 'leftJoin': 左连接，不加载关联实体数据（仅用于条件筛选）
	 * - 'innerJoin': 内连接，不加载关联实体数据（仅用于条件筛选）
	 * - 'leftJoinAndSelect': 左连接并加载关联实体数据（结果包含关联对象）
	 * - 'innerJoinAndSelect': 内连接并加载关联实体数据（结果包含关联对象）
	 */
	type: "leftJoin" | "innerJoin" | "leftJoinAndSelect" | "innerJoinAndSelect";

	/**
	 * 自定义关联条件，可选
	 * 通常情况下不需要指定，TypeORM 会根据实体装饰器自动处理关联关系
	 * 只有在需要额外的自定义条件时才指定此参数
	 *
	 * 示例：`profile.is_active = true` （只关联激活的 profile）
	 */
    condition?: string;
    conditions?: QueryCondition[];
}

/**
 * 查询选项接口 - 定义完整的查询配置
 * 包含所有查询相关的参数，用于构建复杂的SQL查询
 */
export interface QueryOptions {
	/** 自定义查询别名，可选，默认使用表名作为别名 */
	alias?: string;

	/** 关联关系配置数组，定义需要JOIN的表 */
	joins?: JoinRelation[];

	/** 查询条件数组，支持多个AND/OR条件组合 */
	conditions?: QueryCondition[];

	/** 排序配置数组，按指定字段和方向排序 */
	orderBy?: { field: string; direction: "ASC" | "DESC" }[];

	/** 分组字段数组，用于GROUP BY子句 */
	groupBy?: string[];

	/** HAVING条件数组，在分组后进行过滤 */
	having?: QueryCondition[];

	/** 是否查询软删除的数据，默认为false */
	withDeleted?: boolean;

	/** 指定查询字段，可选，用于性能优化 */
	select?: string[];
}

/**
 * 分页查询结果接口 - 包含分页信息和数据
 * 用于返回分页查询的结果
 */
export interface PaginatedQueryResult<T> {
	/** 当前页的数据数组 */
	data: T[];

	/** 总记录数 */
	total: number;

	/** 当前页码 */
	page: number;

	/** 每页记录数 */
	pageSize: number;

	/** 总页数 */
	totalPages: number;
}

/**
 * 查询构建器助手接口 - 提供统一的查询构建和执行方法
 * 封装了TypeORM的SelectQueryBuilder，提供更简洁易用的API
 */
export interface QueryBuilderHelper<T extends ObjectLiteral> {
	/**
	 * 构建查询构建器
	 * 根据提供的选项构建TypeORM的SelectQueryBuilder实例
	 * @param options 查询选项配置
	 * @returns 配置好的查询构建器，可进一步自定义查询
	 */
	buildQuery(options: QueryOptions): SelectQueryBuilder<T>;

	/**
	 * 查询多个结果，支持关联关系
	 * 执行查询并返回所有匹配的记录
	 * @param options 查询选项配置
	 * @returns 匹配记录的数组
	 */
	findWithRelations(options: QueryOptions): Promise<T[]>;

	/**
	 * 分页查询
	 * 执行分页查询并返回分页结果
	 * @param options 查询选项配置
	 * @param page 页码（从1开始）
	 * @param pageSize 每页记录数
	 * @returns 包含分页信息和数据的分页结果
	 */
	findPaginated(
		options: QueryOptions,
		page: number,
		pageSize: number,
		debug?: boolean,
	): Promise<PaginatedQueryResult<T>>;

	/**
	 * 分页查询（原始数据）
	 * 返回未经映射的原始数据库记录
	 */
	findPaginatedRaw(
		options: QueryOptions,
		page: number,
		pageSize: number,
		debug?: boolean,
	): Promise<PaginatedQueryResult<T>>;

	/**
	 * 查询单个结果
	 * 执行查询并返回第一条匹配的记录
	 * @param options 查询选项配置
	 * @returns 第一条匹配的记录，如果没有找到则返回null
	 */
	findOne(options: QueryOptions): Promise<T | null>;

	findOneRaw(options: QueryOptions): Promise<T | null>;

	/**
	 * 统计数量
	 * 执行COUNT查询，返回匹配记录的数量
	 * @param options 查询选项配置
	 * @returns 匹配记录的数量
	 */
	count(options: QueryOptions): Promise<number>;
}
