import { Body, Controller, Post } from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from "@nestjs/swagger";
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
	@ApiOperation({ summary: "注册管理员" })
	@ApiResponse({ status: 201, description: "管理员账号创建成功" })
	register(@Body() dto: RegisterAuthDto) {
		return this.authService.register(dto);
	}

	@Post("login")
	@Public()
	@ApiOperation({ summary: "管理员登录" })
	@ApiResponse({ status: 200, description: "返回访问令牌" })
	login(@Body() dto: LoginAuthDto) {
		return this.authService.login(dto);
	}
}
