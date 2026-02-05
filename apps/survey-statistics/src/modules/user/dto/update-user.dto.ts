import { PartialType, ApiPropertyOptional } from "@nestjs/swagger";
import { IsEmail, IsOptional, IsString, IsNotEmpty } from "class-validator";
import { CreateUserDto } from "./create-user.dto";

export class UpdateUserDto extends PartialType(CreateUserDto) {
	@IsNotEmpty({ message: "用户ID不能为空" })
	@IsString({ message: "用户ID必须是字符串" })
	id: string;

	@IsOptional()
	@IsString({ message: "账户名必须是字符串" })
	@ApiPropertyOptional({ description: "账户名" })
	username?: string;

	@IsOptional()
	@IsEmail({}, { message: "邮箱地址不合法" })
	@ApiPropertyOptional({ description: "邮箱地址" })
	email?: string;
}
