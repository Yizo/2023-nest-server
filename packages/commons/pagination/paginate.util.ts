import { SelectQueryBuilder, ObjectLiteral } from "typeorm";
import { PaginationResult } from "./pagination-result.interface";

export async function paginate<T extends ObjectLiteral>(
	queryBuilder: SelectQueryBuilder<T>,
	page: number,
	pageSize: number
): Promise<PaginationResult<T>> {
	const result: PaginationResult<T> = {
		data: [],
		total: 0,
		page,
		pageSize,
		totalPages: 0,
	};

	let total = 0;
	try {
		const mainAlias = queryBuilder.expressionMap.mainAlias;
		if (!mainAlias) {
			throw new Error("Main alias not found in query builder");
		}
		const rootAlias = mainAlias.name;
		const rootIdColumn = `${rootAlias}.id`;
		const countQuery = queryBuilder
			.clone()
			.offset(undefined)
			.limit(undefined)
			.select(`COUNT(DISTINCT ${rootIdColumn})`, "count")
			.getRawOne();
		const countResult = await countQuery;
		total = parseInt(countResult?.count || "0", 10);
	} catch (error) {
		console.error("Count query error:", error);
		total = 0;
	}
	const totalPages = Math.ceil(total / pageSize) || 1;

	// 处理页码越界
	if (page > totalPages) {
		return result;
	}

	const data = await queryBuilder
		.skip((page - 1) * pageSize)
		.take(pageSize)
		.getRawMany();
	result.data = data;
	result.total = total;
	result.totalPages = totalPages;

	return result;
}
