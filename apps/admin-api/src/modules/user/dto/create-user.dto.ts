import { Type } from "class-transformer";
import {
	IsArray,
	IsIn,
	IsInt,
	IsOptional,
	IsString,
	Length,
	Matches,
	Min,
} from "class-validator";
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";

export class CreateUserDto {
	@ApiProperty({ description: "用户账号，创建后不可修改", example: "zhangsan", maxLength: 100 })
	@IsString({ message: "用户账号必须是字符串" })
	@Length(1, 100, { message: "用户账号长度必须在 1 到 100 个字符之间" })
	@Matches(/^[A-Za-z0-9_]+$/, { message: "用户账号只能包含字母、数字和下划线" })
	userName!: string;

	@ApiProperty({ description: "显示名称", example: "张三", maxLength: 100 })
	@IsString({ message: "显示名称必须是字符串" })
	@Length(1, 100, { message: "显示名称长度必须在 1 到 100 个字符之间" })
	displayName!: string;

	@ApiProperty({ description: "登录密码，只用于创建或修改，不会返回", minLength: 8, maxLength: 128 })
	@IsString({ message: "密码必须是字符串" })
	@Length(8, 128, { message: "密码长度必须在 8 到 128 个字符之间" })
	password!: string;

	@ApiPropertyOptional({ description: "部门 ID 列表", type: [Number], example: [1] })
	@IsOptional()
	@IsArray({ message: "部门 ID 必须是数组" })
	@Type(() => Number)
	@IsInt({ each: true, message: "部门 ID 必须是整数" })
	@Min(1, { each: true, message: "部门 ID 必须是正整数" })
	deptIds?: number[];

	@ApiPropertyOptional({ description: "角色 ID 列表", type: [Number], example: [1] })
	@IsOptional()
	@IsArray({ message: "角色 ID 必须是数组" })
	@Type(() => Number)
	@IsInt({ each: true, message: "角色 ID 必须是整数" })
	@Min(1, { each: true, message: "角色 ID 必须是正整数" })
	roleIds?: number[];

	@ApiPropertyOptional({ description: "状态，0 停用，1 启用", enum: [0, 1], default: 1 })
	@IsOptional()
	@Type(() => Number)
	@IsInt({ message: "状态必须是整数" })
	@IsIn([0, 1], { message: "状态只能是 0 或 1" })
	status?: 0 | 1;
}
