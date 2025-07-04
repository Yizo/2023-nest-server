import { Controller, Get, Post, Body, Headers, Query } from '@nestjs/common';
import { AuthService } from './auth.service';
import { CreateAuthDto } from './dto/create-auth.dto';

@Controller({
  path: 'auth',
  version: '1',
})
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('login')
  login(@Body() createAuthDto: CreateAuthDto) {
    console.log('Login attempt with DTO:', createAuthDto);
    return this.authService.login(createAuthDto);
  }

  @Get('/loginInfo')
  getLoginInfo(
    @Query('userId') userId: string,
    @Headers('access-token') accessToken: string,
  ) {
    console.log('Retrieving login information', userId, accessToken);
    return {
      userId,
      accessToken,
    };
  }
}
