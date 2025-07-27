import { Injectable, UnauthorizedException } from '@nestjs/common';
import { Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { CreateAuthDto, LoginDto } from './dto/create-auth.dto';
import { UserService } from '../user/user.service';

@Injectable()
export class AuthService {
  constructor(
    private readonly userService: UserService,
    private readonly jwtService: JwtService,
    private readonly logger: Logger,
  ) {}

  async login(data: LoginDto) {
    const { username, password } = data;
    const user = await this.userService.findOne(username, password);

    this.logger.log(user, 'auth:service:login=user');

    if (user && user.password === password) {
      const payload = { username: username, sub: user.id };

      const token = await this.jwtService.signAsync(payload);

      this.logger.log(token, 'auth:service:login: token');

      return {
        code: 0,
        message: '登录成功',
        data: {
          ...user,
          token,
        },
      };
    } else {
      throw new UnauthorizedException('用户名或密码错误');
    }
  }

  logout(token: string) {
    console.log('Logging out with token:', token);
    return 'This action logs out a user';
  }

  // 注册
  async register(createAuthDto: CreateAuthDto) {
    const user = await this.userService.create(createAuthDto);
    if (user) {
      return {
        code: 0,
        message: '注册成功',
      };
    }
  }
}
