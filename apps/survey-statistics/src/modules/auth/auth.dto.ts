import { Transform } from "class-transformer";
import { IsString, Length, MaxLength, MinLength } from "class-validator";
import { ApiProperty } from "@nestjs/swagger";

// DTO 是 HTTP 输入契约；密码只在请求体中短暂存在，Service 会立即交给 Argon2。
export class LoginDto {
	@ApiProperty({ description: "用户名或邮箱，不区分大小写", example: "superadmin", minLength: 2, maxLength: 160 })
	@Transform(({ value }) =>
		typeof value === "string" ? value.trim().toLowerCase() : value,
	)
	@IsString({ message: "用户名或邮箱不能为空" })
	@Length(2, 160, { message: "用户名或邮箱长度必须在 2 到 160 个字符之间" })
	username!: string;

	@ApiProperty({ description: "登录密码", example: "local-owner-password-change-me", minLength: 1, maxLength: 128 })
	@IsString({ message: "密码不能为空" })
	@MinLength(1, { message: "密码不能为空" })
	@MaxLength(128, { message: "密码不能超过 128 个字符" })
	password!: string;
}

export class RefreshDto {
	@ApiProperty({ description: "登录时返回的 Refresh Token" })
	@IsString({ message: "刷新令牌不能为空" })
	refreshToken!: string;
}
