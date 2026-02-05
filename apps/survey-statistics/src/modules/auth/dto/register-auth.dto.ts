import { ApiProperty } from "@nestjs/swagger";
import { IsEmail, IsNotEmpty, MinLength } from "class-validator";

export class RegisterAuthDto {
	@IsNotEmpty()
	@ApiProperty({ description: "用户名" })
	username!: string;

	@IsEmail()
	@ApiProperty({ description: "邮箱" })
	email!: string;

	@IsNotEmpty()
	@MinLength(6)
	@ApiProperty({ description: "密码，至少 6 位" })
	password!: string;
}
