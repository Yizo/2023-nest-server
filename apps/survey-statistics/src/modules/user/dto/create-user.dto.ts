import { ApiProperty } from "@nestjs/swagger";
import { IsEmail, IsNotEmpty, MinLength, IsOptional } from "class-validator";

export class CreateUserDto {
	@IsNotEmpty({ message: "账户名不能为空" })
	@ApiProperty({ description: "账户名" })
	username!: string;

	@IsEmail({}, { message: "邮箱地址不合法" })
	@ApiProperty({ description: "邮箱地址" })
	email!: string;

	@IsOptional()
	@MinLength(6, { message: "密码不能少于 6 个字符" })
	@ApiProperty({ description: "密码，最少 6 字符" })
	password?: string;
}
