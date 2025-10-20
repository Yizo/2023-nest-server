import {
  Controller,
  Post,
  Body,
  UseGuards,
  Logger,
  Request,
} from '@nestjs/common';
import { AuthService } from './auth.service';
import { LocalAuthGuard } from './guard';
import { Public } from '@/decorators';

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
  @Public()
  @Post('login')
  login(@Request() req) {
    return this.authService.login(req.user);
  }

  @Post('logout')
  logout(@Body() body: { token: string }) {
    return this.authService.logout(body.token);
  }
}
