import { Injectable, Logger } from "@nestjs/common";
import { SelectQueryBuilder, Repository, ObjectLiteral } from "typeorm";
import {
	QueryBuilderHelper,
	QueryOptions,
	QueryCondition,
	PaginatedQueryResult,
} from "./query-builder.interface";

/**
 * 查询构建器助手实现类
 * 提供基于TypeORM的统一查询构建和执行功能
 * 支持复杂的关联查询、条件筛选、分页等操作
 */
@Injectable()
export class QueryBuilderHelperImpl<T extends ObjectLiteral> implements QueryBuilderHelper<T> {
	private readonly logger = new Logger(QueryBuilderHelperImpl.name);

	/**
	 * 构造函数
	 * @param repository TypeORM Repository实例，用于执行数据库操作
	 */
	constructor(private repository: Repository<T>) {}

	/**
	 * 构建查询构建器
	 * 根据提供的查询选项构建完整的TypeORM SelectQueryBuilder实例
	 * 支持关联查询、条件筛选、排序、分组等功能
	 *
	 * @param options 查询选项配置
	 * @returns 配置完整的SelectQueryBuilder实例，可进一步自定义或直接执行
	 */
	buildQuery(options: QueryOptions, debug = false): SelectQueryBuilder<T> {
		const { joins, conditions, orderBy, groupBy, having, withDeleted, select, alias: customAlias } = options;
		// 获取实体表名作为查询别名
		const alias = customAlias || this.repository.metadata.tableName;
		// 创建基础查询构建器
		let queryBuilder = this.repository.createQueryBuilder(alias);

	// 处理软删除：如果withDeleted为true，查询包含已软删除的记录
	if (withDeleted) {
		queryBuilder = queryBuilder.withDeleted();
	}

	// 处理关联关系：根据JoinRelation配置添加JOIN子句
	if (joins && joins.length > 0) {
		for (const join of joins) {
			const joinMethod = join.type;
			// 构建关联路径
			// 如果 property 包含点号（如 'roles.permissions'），说明是多层级关联，直接使用
			// 否则添加主表别名前缀（如 'user.profile'）
			const relationPath = join.property.includes(".")
				? join.property
				: `${alias}.${join.property}`;

			// 根据关联类型执行相应的JOIN操作
			switch (joinMethod) {
				case "leftJoin":
					// 左连接，不加载关联实体数据
					// 如果有自定义条件则使用，否则让TypeORM自动处理关联
					if (join.condition) {
						queryBuilder = queryBuilder.leftJoin(
							relationPath,
							join.alias,
							join.condition,
						);
					} else {
						queryBuilder = queryBuilder.leftJoin(relationPath, join.alias);
					}
					break;
				case "innerJoin":
					// 内连接，不加载关联实体数据
					// 如果有自定义条件则使用，否则让TypeORM自动处理关联
					if (join.condition) {
						queryBuilder = queryBuilder.innerJoin(
							relationPath,
							join.alias,
							join.condition,
						);
					} else {
						queryBuilder = queryBuilder.innerJoin(relationPath, join.alias);
					}
					break;
				case "leftJoinAndSelect":
					// 左连接并加载关联实体数据（结果中包含关联对象）
					// 如果有自定义条件则使用，否则让TypeORM自动处理关联
					if (join.condition) {
						queryBuilder = queryBuilder.leftJoinAndSelect(
							relationPath,
							join.alias,
							join.condition,
						);
					} else {
						queryBuilder = queryBuilder.leftJoinAndSelect(relationPath, join.alias);
					}
					break;
				case "innerJoinAndSelect":
					// 内连接并加载关联实体数据（结果中包含关联对象）
					// 如果有自定义条件则使用，否则让TypeORM自动处理关联
					if (join.condition) {
						queryBuilder = queryBuilder.innerJoinAndSelect(
							relationPath,
							join.alias,
							join.condition,
						);
					} else {
						queryBuilder = queryBuilder.innerJoinAndSelect(
							relationPath,
							join.alias,
						);
					}
					break;
			}
		}
	}

	// 处理字段选择：指定查询字段以提高性能
	// 注意：必须在 joins 之后处理，这样才能覆盖 joinAndSelect 自动添加的字段
	if (select && select.length > 0) {
		queryBuilder = queryBuilder.select(select);
	}

	// 处理查询条件：按照索引优化顺序应用WHERE条件
	if (conditions && conditions.length > 0) {
		this.applyConditionsOptimized(queryBuilder, conditions, alias);
	}

		// 处理分组
		if (groupBy && groupBy.length > 0) {
			for (const group of groupBy) {
				// 如果字段包含点号（如 'profile.id'），说明是关联表字段，直接使用
				// 否则添加主表别名前缀
				const groupField = group.includes(".") ? group : `${alias}.${group}`;
				queryBuilder = queryBuilder.addGroupBy(groupField);
			}
		}

		// 处理having条件
		if (having && having.length > 0) {
			this.applyConditions(queryBuilder, having, alias, true);
		}

		// 处理排序：ORDER BY应该在HAVING之后
		if (orderBy && orderBy.length > 0) {
			for (const order of orderBy) {
				// 如果字段包含点号（如 'profile.created_at'），说明是关联表字段，直接使用
				// 否则添加主表别名前缀
				const orderField = order.field.includes(".")
					? order.field
					: `${alias}.${order.field}`;
				queryBuilder = queryBuilder.addOrderBy(orderField, order.direction);
			}
		}

		if (debug) {
			console.log("buildQuery:sql", queryBuilder.getSql());
		}

		return queryBuilder;
	}

	/**
	 * 将QueryCondition数组转换为SQL WHERE子句，按照索引优化顺序应用
	 * 支持AND/OR逻辑运算符和多种比较操作符
	 *
	 * @param queryBuilder TypeORM查询构建器实例
	 * @param conditions 查询条件数组
	 * @param alias 表别名，用于构建字段全名
	 * @private
	 */
	private applyConditionsOptimized(
		queryBuilder: SelectQueryBuilder<T>,
		conditions: QueryCondition[],
		alias: string,
	): void {
		// 按照索引优化优先级排序条件
		const sortedConditions = this.sortConditionsByIndexPriority(conditions);

		// 应用排序后的条件
		for (const condition of sortedConditions) {
			this.applySingleCondition(queryBuilder, condition, alias, false);
		}
	}

	/**
	 * 按索引优先级排序查询条件
	 * 优先级：等值查询 > 范围查询 > 模糊查询 > 其他
	 *
	 * @param conditions 查询条件数组
	 * @returns 排序后的查询条件数组
	 * @private
	 */
	private sortConditionsByIndexPriority(conditions: QueryCondition[]): QueryCondition[] {
		const priorityMap = {
			eq: 1, // 等值查询，索引利用最佳
			ne: 4, // 不等查询，索引利用较差
			gt: 2, // 范围查询，索引利用良好
			gte: 2,
			lt: 2,
			lte: 2,
			like: 3, // 模糊查询，索引利用一般
			in: 1, // IN查询，等值查询的一种
			isNull: 3, // NULL检查，索引利用一般
			isNotNull: 3,
		};

		return [...conditions].sort((a, b) => {
			const priorityA = priorityMap[a.operator] || 5;
			const priorityB = priorityMap[b.operator] || 5;

			// 优先级数字越小越优先（1最优先）
			if (priorityA !== priorityB) {
				return priorityA - priorityB;
			}

			// 优先级相同时，AND条件优先，OR条件靠后
			// MySQL 查询优化器会优先使用 AND 条件过滤数据
			if (!a.or && b.or) return -1;
			if (a.or && !b.or) return 1;

			return 0;
		});
	}

	/**
	 * 应用单个查询条件
	 *
	 * @param queryBuilder TypeORM查询构建器实例
	 * @param condition 单个查询条件
	 * @param alias 表别名
	 * @param isHaving 是否为HAVING条件
	 * @private
	 */
	private applySingleCondition(
		queryBuilder: SelectQueryBuilder<T>,
		condition: QueryCondition,
		alias: string,
		isHaving: boolean,
	): void {
		const { field, operator, value, or } = condition;
		// 清理字段名中的特殊字符，生成安全的参数名
		const cleanField = field.replace(/\./g, "_");
		const paramName = `${cleanField}_${Math.random().toString(36).slice(2, 11)}`;
		const fullField = field.includes(".") ? field : `${alias}.${field}`;

		let whereClause: string;
		const params: any = {};

		switch (operator) {
			case "eq":
				whereClause = `${fullField} = :${paramName}`;
				params[paramName] = value;
				break;
			case "ne":
				whereClause = `${fullField} != :${paramName}`;
				params[paramName] = value;
				break;
			case "gt":
				whereClause = `${fullField} > :${paramName}`;
				params[paramName] = value;
				break;
			case "gte":
				whereClause = `${fullField} >= :${paramName}`;
				params[paramName] = value;
				break;
			case "lt":
				whereClause = `${fullField} < :${paramName}`;
				params[paramName] = value;
				break;
			case "lte":
				whereClause = `${fullField} <= :${paramName}`;
				params[paramName] = value;
				break;
			case "like":
				whereClause = `${fullField} LIKE :${paramName}`;
				params[paramName] = `%${value}%`;
				break;
			case "in":
				whereClause = `${fullField} IN (:...${paramName})`;
				params[paramName] = Array.isArray(value) ? value : [value];
				break;
			case "isNull":
				whereClause = `${fullField} IS NULL`;
				break;
			case "isNotNull":
				whereClause = `${fullField} IS NOT NULL`;
				break;
			default:
				throw new Error(`Unsupported operator: ${operator}`);
		}

		if (isHaving) {
			if (or) {
				queryBuilder = queryBuilder.orHaving(whereClause, params);
			} else {
				queryBuilder = queryBuilder.andHaving(whereClause, params);
			}
		} else {
			if (or) {
				queryBuilder = queryBuilder.orWhere(whereClause, params);
			} else {
				queryBuilder = queryBuilder.andWhere(whereClause, params);
			}
		}
	}

	/**
	 * 应用查询条件到查询构建器
	 * 将QueryCondition数组转换为SQL WHERE或HAVING子句
	 * 支持AND/OR逻辑运算符和多种比较操作符
	 *
	 * @param queryBuilder TypeORM查询构建器实例
	 * @param conditions 查询条件数组
	 * @param alias 表别名，用于构建字段全名
	 * @param isHaving 是否为HAVING条件（用于GROUP BY后的过滤）
	 * @private
	 */
	private applyConditions(
		queryBuilder: SelectQueryBuilder<T>,
		conditions: QueryCondition[],
		alias: string,
		isHaving = false,
	): void {
		for (const condition of conditions) {
			this.applySingleCondition(queryBuilder, condition, alias, isHaving);
		}
	}

	/**
	 * 查询多个结果，支持关联关系
	 * 执行完整的SELECT查询，返回所有匹配的记录
	 * 支持复杂的关联查询和条件筛选
	 *
	 * @param options 查询选项配置，包含关联、条件、排序等
	 * @returns 匹配记录的数组，如果没有记录返回空数组
	 *
	 * @example
	 * ```typescript
	 * const users = await userQueryBuilder.findWithRelations({
	 *   joins: [{ property: 'user.profile', alias: 'profile', type: 'leftJoinAndSelect' }],
	 *   conditions: [{ field: 'user.status', operator: 'eq', value: 1 }],
	 *   orderBy: [{ field: 'user.created_at', direction: 'DESC' }]
	 * });
	 * ```
	 */
	async findWithRelations(options: QueryOptions): Promise<T[]> {
		const queryBuilder = this.buildQuery(options);
		return await queryBuilder.getMany();
	}

	/**
	 * 分页查询
	 * 执行分页查询，自动计算总数并返回分页结果
	 * 支持复杂的关联查询和条件筛选的分页
	 *
	 * @param options 查询选项配置，包含关联、条件、排序等
	 * @param page 页码，从1开始计数
	 * @param pageSize 每页记录数
	 * @returns 包含分页信息和数据的分页结果对象
	 *
	 * @example
	 * ```typescript
	 * const result = await userQueryBuilder.findPaginated(
	 *   {
	 *     joins: [{ property: 'user.profile', alias: 'profile', type: 'leftJoinAndSelect' }],
	 *     conditions: [{ field: 'user.status', operator: 'eq', value: 1 }],
	 *     orderBy: [{ field: 'user.created_at', direction: 'DESC' }]
	 *   },
	 *   1,  // 第1页
	 *   10  // 每页10条记录
	 * );
	 *
	 * // result: {
	 * //   data: [...],        // 当前页的数据数组
	 * //   total: 100,          // 总记录数
	 * //   page: 1,             // 当前页码
	 * //   pageSize: 10,        // 每页记录数
	 * //   totalPages: 10       // 总页数
	 * // }
	 * ```
	 */
	async findPaginated(
		options: QueryOptions,
		page: number,
		pageSize: number,
		debug = false,
	): Promise<PaginatedQueryResult<T>> {
		const { joins, alias: customAlias } = options;
		const alias = customAlias || this.repository.metadata.tableName;
		const queryBuilder = this.buildQuery(options);

		// 计算总数：克隆查询构建器，移除分页和排序，执行COUNT查询
		// 判断是否有 JOIN，如果有则使用 COUNT(DISTINCT)，否则使用普通 COUNT
		const hasJoins = joins && joins.length > 0;
		const countExpression = hasJoins
			? `COUNT(DISTINCT ${alias}.id)`
			: `COUNT(${alias}.id)`;

		const countQuery = queryBuilder.clone().select(countExpression, "count");

		const countResult = await countQuery.getRawOne();
		const total = parseInt(countResult?.count || "0", 10);
		const totalPages = Math.ceil(total / pageSize) || 1;

		// 处理页码越界：如果请求页码超过总页数，返回空数据但保留总数信息
		if (page > totalPages && total > 0) {
			return {
				data: [],
				total, // 保留实际总数
				page,
				pageSize,
				totalPages, // 保留实际总页数
			};
		}

		// 获取分页数据：添加OFFSET和LIMIT子句
		const data = await queryBuilder
			.skip((page - 1) * pageSize) // OFFSET: (页码-1) * 每页记录数
			.take(pageSize) // LIMIT: 每页记录数
			.getMany();

		if (debug) {
			this.logger.log(queryBuilder.getSql(), "findPaginated:sql");
		}

		return {
			data,
			total,
			page,
			pageSize,
			totalPages,
		};
	}

	/**
	 * 查询单个结果
	 * 执行查询并返回第一条匹配的记录
	 * 常用于根据ID查询详情或查找特定记录
	 *
	 * @param options 查询选项配置，包含关联、条件等
	 * @returns 第一条匹配的记录，如果没有找到则返回null
	 *
	 * @example
	 * ```typescript
	 * const user = await userQueryBuilder.findOne({
	 *   joins: [{ property: 'user.profile', alias: 'profile', type: 'leftJoinAndSelect' }],
	 *   conditions: [{ field: 'user.id', operator: 'eq', value: 1 }]
	 * });
	 * // 返回ID为1的用户及其Profile信息，或null
	 * ```
	 */
	async findOne(options: QueryOptions): Promise<T | null> {
		const queryBuilder = this.buildQuery(options);
		return await queryBuilder.getOne();
	}

	/**
	 * 统计数量
	 * 执行COUNT查询，返回匹配记录的数量
	 * 常用于分页前的总数统计或条件计数
	 *
	 * @param options 查询选项配置，包含关联、条件等（排序和分页会被忽略）
	 * @returns 匹配记录的数量
	 *
	 * @example
	 * ```typescript
	 * const activeUserCount = await userQueryBuilder.count({
	 *   conditions: [{ field: 'user.status', operator: 'eq', value: 1 }]
	 * });
	 * // 返回状态为激活的用户总数
	 * ```
	 */
	async count(options: QueryOptions): Promise<number> {
		const { joins, alias: customAlias } = options;
		const alias = customAlias || this.repository.metadata.tableName;
		const queryBuilder = this.buildQuery(options);

		// 克隆查询构建器，移除不必要的子句，只保留WHERE条件
		// 判断是否有 JOIN，如果有则使用 COUNT(DISTINCT)，否则使用普通 COUNT
		const hasJoins = joins && joins.length > 0;
		const countExpression = hasJoins
			? `COUNT(DISTINCT ${alias}.id)`
			: `COUNT(${alias}.id)`;

		const countQuery = queryBuilder.clone().select(countExpression, "count");

		const countResult = await countQuery.getRawOne();

		return parseInt(countResult?.count || "0", 10);
	}
}
