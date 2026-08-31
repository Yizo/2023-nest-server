import { Type } from "class-transformer";
import {
	IsBoolean,
	IsEnum,
	IsInt,
	IsOptional,
	IsString,
	Max,
	MaxLength,
	Min,
	ValidateIf,
} from "class-validator";
import { ApiPropertyOptional } from "@nestjs/swagger";
import { DEFAULT_PAGE, DEFAULT_PAGE_SIZE, MAX_PAGE_SIZE } from "@/common/pagination/pagination.dto";
import { MenuType } from "../menu.constants";

export class QueryMenuDto {
	@ApiPropertyOptional({
		description: "页码，不传分页参数时查询全部菜单",
		minimum: 1,
		type: Number,
	})
	@ValidateIf((_, value) => value !== undefined)
	@Type(() => Number)
	@IsInt({ message: "页码必须是整数" })
	@Min(1, { message: "页码不能小于 1" })
	page?: number;

	@ApiPropertyOptional({
		description: "每页数量，不传分页参数时查询全部菜单",
		minimum: 1,
		maximum: MAX_PAGE_SIZE,
		type: Number,
	})
	@ValidateIf((_, value) => value !== undefined)
	@Type(() => Number)
	@IsInt({ message: "每页数量必须是整数" })
	@Min(1, { message: "每页数量不能小于 1" })
	@Max(MAX_PAGE_SIZE, { message: `每页数量不能超过 ${MAX_PAGE_SIZE}` })
	pageSize?: number;

	@ApiPropertyOptional({ description: "菜单类型", enum: MenuType, enumName: "MenuType" })
	@IsOptional()
	@IsEnum(MenuType, { message: "菜单类型不是有效值" })
	type?: MenuType;

	@ApiPropertyOptional({ description: "父菜单 ID，空表示查询根菜单", type: Number, nullable: true })
	@IsOptional()
	@Type(() => Number)
	@IsInt({ message: "父菜单 ID 必须是整数" })
	@Min(1, { message: "父菜单 ID 必须是正整数" })
	parentId?: number | null;

	@ApiPropertyOptional({ description: "名称，模糊匹配", maxLength: 100 })
	@IsOptional()
	@IsString({ message: "名称必须是字符串" })
	@MaxLength(100, { message: "名称不能超过 100 个字符" })
	name?: string;

	@ApiPropertyOptional({ description: "编码，模糊匹配", maxLength: 100 })
	@IsOptional()
	@IsString({ message: "编码必须是字符串" })
	@MaxLength(100, { message: "编码不能超过 100 个字符" })
	code?: string;

	@ApiPropertyOptional({ description: "路由路径，模糊匹配", maxLength: 255 })
	@IsOptional()
	@IsString({ message: "路由路径必须是字符串" })
	@MaxLength(255, { message: "路由路径不能超过 255 个字符" })
	path?: string;

	@ApiPropertyOptional({ description: "是否显示" })
	@IsOptional()
	@IsBoolean({ message: "是否显示必须是布尔值" })
	visible?: boolean;
}
