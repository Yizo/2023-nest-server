import { Injectable } from '@nestjs/common';
import { Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { compare } from 'bcrypt';
import { UserService } from '@/modules/user/user.service';

@Injectable()
export class AuthService {
  constructor(
    private readonly userService: UserService,
    private readonly jwtService: JwtService,
    private readonly logger: Logger,
  ) {}

  async login(user: any) {
    const payload = { username: user.username, sub: user.id };

    const token = await this.jwtService.signAsync(payload);

    this.logger.log(token, 'auth:service:login: token');

    return {
      code: 0,
      message: '登录成功',
      data: {
        username: user.username,
        token,
      },
    };
  }

  logout(token: string) {
    console.log('Logging out with token:', token);
    return 'This action logs out a user';
  }

  async validateUser(username: string, password: string) {
    const user = await this.userService.findOneByUserNameAndPassword(
      username,
      password,
    );
    if (user && (await compare(password, user.password))) {
      return user;
    }
    return null;
  }
}
