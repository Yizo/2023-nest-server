import { ApiProperty } from "@nestjs/swagger";
import { IsNotEmpty, MinLength } from "class-validator";

export class LoginAuthDto {
	@IsNotEmpty()
	@ApiProperty({ description: "用户名" })
	username!: string;

	@IsNotEmpty()
	@MinLength(6)
	@ApiProperty({ description: "密码" })
	password!: string;
}
