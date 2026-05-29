import { BadRequestException } from "@nestjs/common";

/** 中间件用：text/plain 下的 JSON 字符串 → 对象/数组 */
export function parseReportBodyString(raw: string): unknown {
	const trimmed = raw.trim();
	if (!trimmed) {
		throw new BadRequestException("上报数据不能为空");
	}
	try {
		return JSON.parse(trimmed) as unknown;
	} catch {
		throw new BadRequestException("上报数据须为合法 JSON");
	}
}

/** 管道用：单条对象 → 数组（body 已由 json/text 中间件解析为对象） */
export function toReportItems(value: unknown): unknown[] {
	if (Array.isArray(value)) {
		return value;
	}
	if (value !== null && typeof value === "object") {
		return [value];
	}
	throw new BadRequestException("上报数据格式错误，需为对象或对象数组");
}
