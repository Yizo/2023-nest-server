import { BadRequestException } from "@nestjs/common";

/** 只允许不重复的正整数 ID。 */
export function normalizeIds(ids: unknown, fieldName: string): number[] {
	if (!Array.isArray(ids)) throw new BadRequestException(`${fieldName}必须是数组`);
	if (!ids.every((id) => Number.isSafeInteger(id) && id > 0)) {
		throw new BadRequestException(`${fieldName}必须是正整数`);
	}

	const normalized = [...new Set(ids)];
	if (normalized.length !== ids.length) throw new BadRequestException(`${fieldName}不能重复`);
	return normalized;
}

/** 计算两个 ID 列表的新增项和删除项。 */
export function getIdDiff(currentIds: number[], targetIds: number[]): {
	toAdd: number[];
	toRemove: number[];
} {
	const currentSet = new Set(currentIds);
	const targetSet = new Set(targetIds);
	return {
		toAdd: targetIds.filter((id) => !currentSet.has(id)),
		toRemove: currentIds.filter((id) => !targetSet.has(id)),
	};
}
