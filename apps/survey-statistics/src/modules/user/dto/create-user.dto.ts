import { ApiProperty } from "@nestjs/swagger";
import { IsEmail, IsNotEmpty, MinLength } from "class-validator";

export class CreateUserDto {
	@IsNotEmpty()
	@ApiProperty({ description: "账户名" })
	username!: string;

	@IsEmail()
	@ApiProperty({ description: "邮箱地址" })
	email!: string;

	@IsNotEmpty()
	@MinLength(6)
	@ApiProperty({ description: "密码，最少 6 字符" })
	password!: string;
}
