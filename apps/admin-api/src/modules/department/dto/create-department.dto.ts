import { Type } from "class-transformer";
import {
	IsIn,
	IsInt,
	IsOptional,
	IsString,
	Length,
	Min,
} from "class-validator";
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";

export class CreateDepartmentDto {
	@ApiProperty({ description: "部门名称", example: "技术部", maxLength: 100 })
	@IsString({ message: "部门名称必须是字符串" })
	@Length(1, 100, { message: "部门名称长度必须在 1 到 100 个字符之间" })
	deptName!: string;

	@ApiPropertyOptional({
		description: "父部门 ID，空表示根部门",
		type: Number,
		minimum: 1,
		nullable: true,
	})
	@IsOptional()
	@Type(() => Number)
	@IsInt({ message: "父部门 ID 必须是整数" })
	@Min(1, { message: "父部门 ID 必须是正整数" })
	parentId?: number | null;

	@ApiPropertyOptional({ description: "排序，数值越小越靠前", default: 0 })
	@IsOptional()
	@Type(() => Number)
	@IsInt({ message: "排序必须是整数" })
	@Min(0, { message: "排序不能小于 0" })
	sort?: number;

	@ApiPropertyOptional({ description: "状态，0 停用，1 启用", enum: [0, 1], default: 1 })
	@IsOptional()
	@Type(() => Number)
	@IsInt({ message: "状态必须是整数" })
	@IsIn([0, 1], { message: "状态只能是 0 或 1" })
	status?: 0 | 1;
}
