import { ObjectLiteral, SelectQueryBuilder } from "typeorm";

/**
 * 分页查询模式
 * - entity: 返回 TypeORM 实体对象（自动映射字段）
 * - raw: 返回原始数据（更灵活，适合复杂查询）
 */
export type PaginationMode = "entity" | "raw";
export interface PaginationParams {
	page?: number;
	pageSize?: number;
	mode?: PaginationMode;
}
export interface PaginatedResult<T> {
	data: T[];
	total: number;
	page: number;
	pageSize: number;
	totalPages: number;
}

export async function paginateBuilder<T = ObjectLiteral>(
	queryBuilder: SelectQueryBuilder<T>,
	params: PaginationParams,
): Promise<PaginatedResult<T>> {
	const { page = 1, pageSize = 10, mode = "entity" } = params;
	const skip = (page - 1) * pageSize;

	const countQueryBuilder = queryBuilder.clone();

	const total = await countQueryBuilder.getCount();

	const data =
		mode === "raw"
			? await queryBuilder.skip(skip).take(pageSize).getRawMany()
			: await queryBuilder.skip(skip).take(pageSize).getMany();

	return {
		data,
		total,
		page,
		pageSize,
		totalPages: Math.ceil(total / pageSize),
	};
}
