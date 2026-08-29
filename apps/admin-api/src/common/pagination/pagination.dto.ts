import { ApiPropertyOptional } from "@nestjs/swagger";
import { Type } from "class-transformer";
import { IsInt, IsOptional, Max, Min } from "class-validator";

/** 管理后台页码分页的统一默认值。所有分页列表都应经过最大页大小限制。 */
export const DEFAULT_PAGE = 1;
export const DEFAULT_PAGE_SIZE = 20;
export const MAX_PAGE_SIZE = 100;

/**
 * 页码分页的公共输入。
 *
 * 业务查询 DTO 继承此类后，只需要声明自身的筛选条件；分页参数、转换和边界校验保持一致。
 */
export class PageQueryDto {
	@ApiPropertyOptional({
		description: "页码",
		default: DEFAULT_PAGE,
		minimum: 1,
		type: Number,
	})
	@IsOptional()
	@Type(() => Number)
	@IsInt({ message: "页码必须是整数" })
	@Min(1, { message: "页码不能小于 1" })
	page = DEFAULT_PAGE;

	@ApiPropertyOptional({
		description: "每页数量",
		default: DEFAULT_PAGE_SIZE,
		minimum: 1,
		maximum: MAX_PAGE_SIZE,
		type: Number,
	})
	@IsOptional()
	@Type(() => Number)
	@IsInt({ message: "每页数量必须是整数" })
	@Min(1, { message: "每页数量不能小于 1" })
	@Max(MAX_PAGE_SIZE, { message: `每页数量不能超过 ${MAX_PAGE_SIZE}` })
	pageSize = DEFAULT_PAGE_SIZE;
}
