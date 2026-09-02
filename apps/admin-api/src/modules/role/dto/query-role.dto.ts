import { Type } from "class-transformer";
import { IsIn, IsOptional, IsString, MaxLength } from "class-validator";
import { ApiPropertyOptional } from "@nestjs/swagger";
import { PageQueryDto } from "@/common/pagination";

export class QueryRoleDto extends PageQueryDto {
	@ApiPropertyOptional({ description: "角色名称，模糊匹配", maxLength: 100 })
	@IsOptional()
	@IsString({ message: "角色名称必须是字符串" })
	@MaxLength(100, { message: "角色名称不能超过 100 个字符" })
	roleName?: string;

	@ApiPropertyOptional({ description: "角色编码，模糊匹配", maxLength: 100 })
	@IsOptional()
	@IsString({ message: "角色编码必须是字符串" })
	@MaxLength(100, { message: "角色编码不能超过 100 个字符" })
	roleCode?: string;

	@ApiPropertyOptional({ description: "状态，0 停用，1 启用", enum: [0, 1] })
	@IsOptional()
	@Type(() => Number)
	@IsIn([0, 1], { message: "状态只能是 0 或 1" })
	status?: 0 | 1;
}
