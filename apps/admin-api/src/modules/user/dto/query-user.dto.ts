import { Type } from "class-transformer";
import { IsIn, IsInt, IsOptional, IsString, MaxLength, Min } from "class-validator";
import { ApiPropertyOptional } from "@nestjs/swagger";
import { PageQueryDto } from "@/common/pagination";

export class QueryUserDto extends PageQueryDto {
	@ApiPropertyOptional({ description: "用户账号，模糊匹配", maxLength: 100 })
	@IsOptional()
	@IsString({ message: "用户账号必须是字符串" })
	@MaxLength(100, { message: "用户账号不能超过 100 个字符" })
	userName?: string;

	@ApiPropertyOptional({ description: "显示名称，模糊匹配", maxLength: 100 })
	@IsOptional()
	@IsString({ message: "显示名称必须是字符串" })
	@MaxLength(100, { message: "显示名称不能超过 100 个字符" })
	displayName?: string;

	@ApiPropertyOptional({ description: "所属部门 ID", type: Number, minimum: 1 })
	@IsOptional()
	@Type(() => Number)
	@IsInt({ message: "部门 ID 必须是整数" })
	@Min(1, { message: "部门 ID 必须是正整数" })
	deptId?: number;

	@ApiPropertyOptional({ description: "状态，0 停用，1 启用", enum: [0, 1] })
	@IsOptional()
	@Type(() => Number)
	@IsInt({ message: "状态必须是整数" })
	@IsIn([0, 1], { message: "状态只能是 0 或 1" })
	status?: 0 | 1;
}
