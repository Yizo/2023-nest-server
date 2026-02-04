export function formatPage(
	page: number | string,
	pageSize: number | string,
	{ maxPageSize = 100 }: { maxPageSize?: number } = {}
) {
	let pageNum = typeof page === "string" ? Number.parseInt(page, 10) : page ?? 1;
	let pageSizeNum = typeof pageSize === "string" ? Number.parseInt(pageSize, 10) : pageSize ?? 10;

	Number.isNaN(pageNum) && (pageNum = 1);
	Number.isNaN(pageSizeNum) && (pageSizeNum = 10);

	pageNum = Math.max(1, pageNum);
	pageSizeNum = Math.min(maxPageSize, pageSizeNum);

	return {
		page: pageNum,
		pageSize: pageSizeNum,
	};
}
