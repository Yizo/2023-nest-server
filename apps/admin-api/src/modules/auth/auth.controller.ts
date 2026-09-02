import { Body, Controller, Get, HttpCode, HttpStatus, Post } from "@nestjs/common";
import { ApiBody, ApiOperation, ApiTags } from "@nestjs/swagger";
import { AuthRequired, CurrentUser, Public } from "@/common/decorators";
import type { AuthenticatedUser } from "@/common/types";
import { LoginDto, RefreshTokenDto } from "./dto";
import { AuthService } from "./auth.service";

@ApiTags("认证")
@Controller("auth")
export class AuthController {
	constructor(private readonly auth: AuthService) {}

	@Post("login")
	@Public()
	@HttpCode(HttpStatus.OK)
	@ApiOperation({ summary: "用户登录" })
	@ApiBody({ type: LoginDto })
	login(@Body() dto: LoginDto) {
		return this.auth.login(dto);
	}

	@Post("refresh")
	@Public()
	@HttpCode(HttpStatus.OK)
	@ApiOperation({ summary: "刷新登录令牌" })
	@ApiBody({ type: RefreshTokenDto })
	refresh(@Body() dto: RefreshTokenDto) {
		return this.auth.refresh(dto);
	}

	@Post("logout")
	@AuthRequired()
	@HttpCode(HttpStatus.NO_CONTENT)
	@ApiOperation({ summary: "退出登录" })
	async logout(@CurrentUser() user: AuthenticatedUser): Promise<void> {
		await this.auth.logout(user.id);
	}

	@Get("me")
	@AuthRequired()
	@ApiOperation({ summary: "当前登录用户" })
	me(@CurrentUser() user: AuthenticatedUser) {
		return user;
	}
}
