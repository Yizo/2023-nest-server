import { IsNotEmpty, IsNumber, IsOptional, IsString, MaxLength } from "class-validator";
import { IsPositiveIntegerString } from "@/common/decorators/dto/Is-positiveInteger-string";

export class UpdateRoleDto {
	@IsNotEmpty({ message: "角色ID不能为空" })
	@IsNumber({ allowNaN: false, allowInfinity: false }, { message: "角色ID必须是数字" })
	id: number;

	@IsOptional()
	@IsString({ message: "角色名称必须是字符串" })
	@MaxLength(10, { message: "角色名称不能超过10个字符" })
	name?: string;

	@IsOptional()
	@IsPositiveIntegerString({ message: "角色代码必须是正整数字符串" })
	@MaxLength(10, { message: "角色代码不能超过10个字符" })
	code?: string;

	@IsOptional()
	@IsString({ message: "角色描述必须是字符串" })
	@MaxLength(50, { message: "角色描述不能超过50个字符" })
	description?: string;
}
