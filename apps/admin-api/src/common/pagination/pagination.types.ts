/** 页码分页的统一返回结构。 */
export interface PageResult<T> {
	items: T[];
	total: number;
	page: number;
	pageSize: number;
}
