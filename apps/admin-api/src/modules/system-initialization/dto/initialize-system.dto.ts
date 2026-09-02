import { ApiPropertyOptional } from "@nestjs/swagger";
import { IsOptional, IsString, Length, Matches } from "class-validator";

/** 首次初始化时创建超级管理员所需的账号信息；重复初始化时可以不传。 */
export class InitializeSystemDto {
	@ApiPropertyOptional({ description: "超级管理员账号，首次初始化时必填", maxLength: 100 })
	@IsOptional()
	@IsString({ message: "超级管理员账号必须是字符串" })
	@Length(1, 100, { message: "超级管理员账号长度必须在 1 到 100 个字符之间" })
	@Matches(/^[A-Za-z0-9_]+$/, { message: "超级管理员账号只能包含字母、数字和下划线" })
	userName?: string;

	@ApiPropertyOptional({ description: "超级管理员密码，首次初始化时必填", minLength: 8, maxLength: 128 })
	@IsOptional()
	@IsString({ message: "超级管理员密码必须是字符串" })
	@Length(8, 128, { message: "超级管理员密码长度必须在 8 到 128 个字符之间" })
	password?: string;
}
