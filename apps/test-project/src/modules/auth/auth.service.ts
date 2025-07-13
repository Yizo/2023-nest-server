import { HttpStatus, Injectable } from '@nestjs/common';
import { CreateAuthDto, LoginDto } from './dto/create-auth.dto';
import { UserService } from '../user/user.service';

@Injectable()
export class AuthService {
  constructor(private readonly userService: UserService) {}

  async login(data: LoginDto) {
    const { username, password } = data;
    const user = await this.userService.findOne(username, password);
    console.log('Login attempt with DTO:', data, user);
    if (user) {
      return {
        code: 0,
        message: '登录成功',
        data: user,
      };
    } else {
      return {
        code: HttpStatus.UNAUTHORIZED,
        message: '用户名或密码错误',
      };
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
