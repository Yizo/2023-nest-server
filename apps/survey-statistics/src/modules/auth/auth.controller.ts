import { Body, Controller, Get, Post, Req } from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from "@nestjs/swagger";
import { Throttle } from "@nestjs/throttler";
import { Request } from "express";
import { AuthService } from "./auth.service";
import { RegisterAuthDto } from "./dto/register-auth.dto";
import { LoginAuthDto } from "./dto/login-auth.dto";
import { Public } from "@/common/decorators/public.decorator";

@Controller("auth")
@ApiTags("auth")
@ApiBearerAuth()
export class AuthController {
	constructor(private readonly authService: AuthService) {}

	@Post("register")
	@Public()
	@Throttle(5, 60)
	@ApiOperation({ summary: "注册管理员" })
	@ApiResponse({ status: 201, description: "管理员账号创建成功" })
	register(@Body() dto: RegisterAuthDto) {
		return this.authService.register(dto);
	}

	@Post("login")
	@Public()
	@Throttle(5, 60)
	@ApiOperation({ summary: "管理员登录" })
	@ApiResponse({ status: 200, description: "返回访问令牌" })
	login(@Body() dto: LoginAuthDto) {
		return this.authService.login(dto);
	}

	@Get("logout")
	@Public()
	@ApiOperation({ summary: "管理员退出（无需有效 token，过期也可退出）" })
	@ApiResponse({ status: 200, description: "退出成功" })
	logout(@Req() req: Request) {
		return this.authService.logoutFromRequest(req);
	}
}
