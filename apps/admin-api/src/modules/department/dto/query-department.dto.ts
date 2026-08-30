import { Type } from "class-transformer";
import { IsIn, IsInt, IsOptional, IsString, MaxLength, Min } from "class-validator";
import { ApiPropertyOptional } from "@nestjs/swagger";
import { PageQueryDto } from "@/common/pagination";

export class QueryDepartmentDto extends PageQueryDto {
	@ApiPropertyOptional({ description: "部门名称，模糊匹配", maxLength: 100 })
	@IsOptional()
	@IsString({ message: "部门名称必须是字符串" })
	@MaxLength(100, { message: "部门名称不能超过 100 个字符" })
	deptName?: string;

	@ApiPropertyOptional({ description: "父部门 ID，只查询直接子部门", minimum: 1, type: Number })
	@IsOptional()
	@Type(() => Number)
	@IsInt({ message: "父部门 ID 必须是整数" })
	@Min(1, { message: "父部门 ID 必须是正整数" })
	parentId?: number;

	@ApiPropertyOptional({ description: "状态，0 停用，1 启用", enum: [0, 1] })
	@IsOptional()
	@Type(() => Number)
	@IsInt({ message: "状态必须是整数" })
	@IsIn([0, 1], { message: "状态只能是 0 或 1" })
	status?: 0 | 1;
}
