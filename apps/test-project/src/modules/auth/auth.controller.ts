import {
  Controller,
  Post,
  Body,
  Get,
  UseGuards,
  Request,
  Logger,
} from '@nestjs/common';
import { AuthService } from './auth.service';
import { CreateAuthDto, LoginDto } from './dto/create-auth.dto';
import { JwtAuthGuard } from './jwt-auth.guard';

@Controller({
  version: '1',
  path: 'auth',
})
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly logger: Logger,
  ) {}

  @Post('login')
  login(@Body() loginDto: LoginDto) {
    return this.authService.login(loginDto);
  }

  @Post('register')
  register(@Body() createAuthDto: CreateAuthDto) {
    return this.authService.register(createAuthDto);
  }

  @Post('logout')
  logout(@Body() body: { token: string }) {
    return this.authService.logout(body.token);
  }

  // 测试JWT验证的端点
  @Get('test-jwt')
  @UseGuards(JwtAuthGuard)
  testJwt(@Request() req) {
    this.logger.log(
      `User authenticated: ${req.user.username}`,
      'auth.controller',
    );
    return {
      code: 0,
      message: 'JWT验证成功',
      data: {
        user: req.user,
        timestamp: new Date().toISOString(),
      },
    };
  }
}
