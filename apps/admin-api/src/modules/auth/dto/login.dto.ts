import { IsString, Length } from "class-validator";
import { ApiProperty } from "@nestjs/swagger";

export class LoginDto {
	@ApiProperty({ description: "用户账号", example: "admin", maxLength: 100 })
	@IsString({ message: "用户账号必须是字符串" })
	@Length(1, 100, { message: "用户账号长度必须在 1 到 100 个字符之间" })
	userName!: string;

	@ApiProperty({ description: "登录密码", minLength: 8, maxLength: 128 })
	@IsString({ message: "密码必须是字符串" })
	@Length(8, 128, { message: "密码长度必须在 8 到 128 个字符之间" })
	password!: string;
}
