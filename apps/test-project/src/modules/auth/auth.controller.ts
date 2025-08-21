import {
  Controller,
  Post,
  Body,
  UseGuards,
  Logger,
  Request,
} from '@nestjs/common';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/create-auth.dto';
import { JwtAuthGuard } from './jwt.guard';
import { LocalAuthGuard } from './local.guard';

@Controller({
  version: '1',
  path: 'auth',
})
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly logger: Logger,
  ) {}

  @UseGuards(LocalAuthGuard)
  @Post('login')
  login(@Body() body: LoginDto, @Request() req) {
    return this.authService.login(req.user);
  }

  @UseGuards(JwtAuthGuard)
  @Post('logout')
  logout(@Body() body: { token: string }) {
    return this.authService.logout(body.token);
  }
}
