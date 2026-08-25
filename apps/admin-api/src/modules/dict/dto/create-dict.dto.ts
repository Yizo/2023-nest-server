import { Type } from "class-transformer";
import {
	IsIn,
	IsInt,
	IsOptional,
	IsString,
	Length,
	Matches,
	MaxLength,
	Min,
} from "class-validator";
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";

export class CreateDictTypeDto {
	@ApiProperty({ description: "字典名称", example: "权限类型", maxLength: 100 })
	@IsString({ message: "字典名称必须是字符串" })
	@Length(1, 100, { message: "字典名称长度必须在 1 到 100 个字符之间" })
	dictName!: string;

	@ApiProperty({
		description: "字典类型编码，创建后不可修改",
		example: "permission_type",
		maxLength: 100,
	})
	@IsString({ message: "字典类型必须是字符串" })
	@Length(1, 100, { message: "字典类型长度必须在 1 到 100 个字符之间" })
	@Matches(/^[A-Za-z0-9_]+$/, { message: "字典类型只能包含字母、数字和下划线" })
	dictType!: string;

	@ApiPropertyOptional({ description: "状态，0 停用，1 启用", enum: [0, 1], default: 1 })
	@IsOptional()
	@Type(() => Number)
	@IsIn([0, 1], { message: "状态只能是 0 或 1" })
	status?: 0 | 1;

	@ApiPropertyOptional({ description: "备注", maxLength: 500, nullable: true })
	@IsOptional()
	@IsString({ message: "备注必须是字符串" })
	@MaxLength(500, { message: "备注不能超过 500 个字符" })
	remark?: string | null;
}

export class CreateDictDataDto {
	@ApiProperty({ description: "所属字典类型编码", example: "permission_type", maxLength: 100 })
	@IsString({ message: "字典类型必须是字符串" })
	@Length(1, 100, { message: "字典类型长度必须在 1 到 100 个字符之间" })
	@Matches(/^[A-Za-z0-9_]+$/, { message: "字典类型只能包含字母、数字和下划线" })
	dictType!: string;

	@ApiProperty({ description: "字典标签", example: "菜单", maxLength: 100 })
	@IsString({ message: "字典标签必须是字符串" })
	@Length(1, 100, { message: "字典标签长度必须在 1 到 100 个字符之间" })
	label!: string;

	@ApiProperty({ description: "字典值", example: "menu", maxLength: 100 })
	@IsString({ message: "字典值必须是字符串" })
	@Length(1, 100, { message: "字典值长度必须在 1 到 100 个字符之间" })
	value!: string;

	@ApiPropertyOptional({ description: "排序，数值越小越靠前", default: 0 })
	@IsOptional()
	@Type(() => Number)
	@IsInt({ message: "排序必须是整数" })
	@Min(0, { message: "排序不能小于 0" })
	sort?: number;

	@ApiPropertyOptional({ description: "状态，0 停用，1 启用", enum: [0, 1], default: 1 })
	@IsOptional()
	@Type(() => Number)
	@IsIn([0, 1], { message: "状态只能是 0 或 1" })
	status?: 0 | 1;

	@ApiPropertyOptional({ description: "备注", maxLength: 500, nullable: true })
	@IsOptional()
	@IsString({ message: "备注必须是字符串" })
	@MaxLength(500, { message: "备注不能超过 500 个字符" })
	remark?: string | null;
}
