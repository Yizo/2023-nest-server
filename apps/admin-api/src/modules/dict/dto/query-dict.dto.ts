import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { Type } from "class-transformer";
import { IsIn, IsOptional, IsString, Length, Matches } from "class-validator";
import { PageQueryDto } from "@/common/pagination";

export class QueryDictTypeDto extends PageQueryDto {
	@ApiPropertyOptional({ description: "字典名称，模糊匹配" })
	@IsOptional()
	@IsString({ message: "字典名称必须是字符串" })
	dictName?: string;

	@ApiPropertyOptional({ description: "字典类型编码，模糊匹配" })
	@IsOptional()
	@IsString({ message: "字典类型必须是字符串" })
	dictType?: string;

	@ApiPropertyOptional({ description: "状态，0 停用，1 启用", enum: [0, 1] })
	@IsOptional()
	@Type(() => Number)
	@IsIn([0, 1], { message: "状态只能是 0 或 1" })
	status?: 0 | 1;
}

export class QueryDictDataDto extends PageQueryDto {
	@ApiProperty({ description: "所属字典类型编码", example: "permission_type" })
	@IsString({ message: "字典类型必须是字符串" })
	@Length(1, 100, { message: "字典类型长度必须在 1 到 100 个字符之间" })
	@Matches(/^[A-Za-z0-9_]+$/, { message: "字典类型只能包含字母、数字和下划线" })
	dictType!: string;

	@ApiPropertyOptional({ description: "字典标签，模糊匹配" })
	@IsOptional()
	@IsString({ message: "字典标签必须是字符串" })
	label?: string;

	@ApiPropertyOptional({ description: "字典值，模糊匹配" })
	@IsOptional()
	@IsString({ message: "字典值必须是字符串" })
	value?: string;

	@ApiPropertyOptional({ description: "状态，0 停用，1 启用", enum: [0, 1] })
	@IsOptional()
	@Type(() => Number)
	@IsIn([0, 1], { message: "状态只能是 0 或 1" })
	status?: 0 | 1;
}
