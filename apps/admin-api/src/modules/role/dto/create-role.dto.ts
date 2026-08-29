import { Type } from "class-transformer";
import {
	IsIn,
	IsEnum,
	IsInt,
	IsOptional,
	IsString,
	Length,
	Matches,
	MaxLength,
	Min,
} from "class-validator";
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { DataScope } from "../role.constants";

export class CreateRoleDto {
	@ApiProperty({ description: "角色名称", example: "审计员", maxLength: 100 })
	@IsString({ message: "角色名称必须是字符串" })
	@Length(1, 100, { message: "角色名称长度必须在 1 到 100 个字符之间" })
	roleName!: string;

	@ApiProperty({ description: "角色编码，创建后不可修改", example: "auditor", maxLength: 100 })
	@IsString({ message: "角色编码必须是字符串" })
	@Length(1, 100, { message: "角色编码长度必须在 1 到 100 个字符之间" })
	@Matches(/^[A-Za-z0-9_]+$/, { message: "角色编码只能包含字母、数字和下划线" })
	roleCode!: string;

	@ApiPropertyOptional({ description: "数据范围策略", enum: DataScope, default: DataScope.ALL })
	@IsOptional()
	@IsEnum(DataScope, { message: "数据范围不是有效的枚举值" })
	dataScope?: DataScope;

	@ApiPropertyOptional({ description: "状态，0 停用，1 启用", enum: [0, 1], default: 1 })
	@IsOptional()
	@Type(() => Number)
	@IsInt({ message: "状态必须是整数" })
	@IsIn([0, 1], { message: "状态只能是 0 或 1" })
	status?: 0 | 1;

	@ApiPropertyOptional({ description: "备注", maxLength: 500, nullable: true })
	@IsOptional()
	@IsString({ message: "备注必须是字符串" })
	@MaxLength(500, { message: "备注不能超过 500 个字符" })
	remark?: string | null;
}
