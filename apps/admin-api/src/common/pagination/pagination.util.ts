import type { PageQueryDto } from "./pagination.dto";

/** 将已通过 DTO 校验的页码参数转换为 MikroORM 的 limit/offset。 */
export function getOffsetPagination(query: Pick<PageQueryDto, "page" | "pageSize">) {
	return {
		limit: query.pageSize,
		offset: (query.page - 1) * query.pageSize,
	};
}
