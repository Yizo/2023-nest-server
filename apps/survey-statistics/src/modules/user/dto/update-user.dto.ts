import { PartialType, ApiPropertyOptional } from "@nestjs/swagger";
import { IsEmail, IsOptional, MinLength, IsString } from "class-validator";
import { CreateUserDto } from "./create-user.dto";

export class UpdateUserDto extends PartialType(CreateUserDto) {
	@IsOptional()
	@IsString()
	@ApiPropertyOptional({ description: "账户名" })
	username?: string;

	@IsOptional()
	@IsEmail()
	@ApiPropertyOptional({ description: "邮箱地址" })
	email?: string;

	@IsOptional()
	@MinLength(6)
	@ApiPropertyOptional({ description: "密码" })
	password?: string;
}
