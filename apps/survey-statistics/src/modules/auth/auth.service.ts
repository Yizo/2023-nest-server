import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { UserService } from '../user/user.service';
import { RegisterAuthDto } from './dto/register-auth.dto';
import { LoginAuthDto } from './dto/login-auth.dto';

@Injectable()
export class AuthService {
  constructor(
    private readonly userService: UserService,
    private readonly jwtService: JwtService,
  ) {}

  async register(dto: RegisterAuthDto) {
    const user = await this.userService.create(dto);
    return this.signToken(user.id, user.username);
  }

  async login(dto: LoginAuthDto) {
    const user = await this.userService.findByUsername(dto.username);
    if (!user) {
      throw new UnauthorizedException('用户名或密码错误');
    }
    const valid = await bcrypt.compare(dto.password, user.password);
    if (!valid) {
      throw new UnauthorizedException('用户名或密码错误');
    }
    return this.signToken(user.id, user.username);
  }

  private signToken(userId: string, username: string) {
    const accessToken = this.jwtService.sign({
      sub: userId,
      username,
    });
    return {
      accessToken,
      user: {
        id: userId,
        username,
      },
    };
  }
}
