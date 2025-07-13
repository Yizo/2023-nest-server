import { Controller, Get, Post, Body, Headers, Query } from '@nestjs/common';
import { AuthService } from './auth.service';
import { CreateAuthDto, LoginDto } from './dto/create-auth.dto';

@Controller({
  path: 'auth',
  version: '1',
})
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('login')
  login(@Body() data: LoginDto) {
    console.log('Login attempt with DTO:', data);
    return this.authService.login(data);
  }

  @Get('logout')
  logout(@Headers('Authorization') token: string) {
    console.log('Logout attempt with token:', token);
    return this.authService.logout(token);
  }

  @Post('register')
  register(@Body() createAuthDto: CreateAuthDto) {
    return this.authService.register(createAuthDto);
  }
}
