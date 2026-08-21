import { Body, Controller, Post } from "@nestjs/common";
import { ApiOperation, ApiTags } from "@nestjs/swagger";
import { Public } from "@/common/decorators";
import { AuthService } from "./auth.service";
import { LoginDto, RefreshDto } from "./auth.dto";

/** 认证接口只负责接收凭据和返回 token，用户创建由 Identity 管理接口完成。 */
@ApiTags("认证")
@Controller("auth")
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @Public()
  @Post("login")
  @ApiOperation({ summary: "登录", description: "使用用户名或邮箱登录，返回 access token 和 refresh token。" })
  login(@Body() body: LoginDto) {
    return this.auth.login(body.username, body.password);
  }

  @Public()
  @Post("refresh")
  @ApiOperation({ summary: "刷新令牌", description: "用 refresh token 换取新的 access token；旧 refresh token 会失效。" })
  refresh(@Body() body: RefreshDto) {
    return this.auth.refresh(body.refreshToken);
  }

  @Public()
  @Post("logout")
  @ApiOperation({ summary: "登出", description: "作废当前 refresh token。" })
  logout(@Body() body: RefreshDto) {
    return this.auth.logout(body.refreshToken);
  }
}
