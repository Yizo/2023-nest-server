import { Inject, Injectable, Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
// import { Redis } from 'ioredis';
// import { InjectRedis } from '@nestjs-modules/ioredis';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';
import { ConfigService } from '@nestjs/config';
import { UserService } from '@/modules/user/user.service';
import { RedisConfig } from '@/enums';
import { LoginDto } from './dto/auth.dto';
@Injectable()
export class AuthService {
  constructor(
    private readonly userService: UserService,
    private readonly jwtService: JwtService,
    private readonly logger: Logger,
    private readonly configService: ConfigService,
    // @InjectRedis() private readonly redis: Redis,
    @Inject(CACHE_MANAGER) private readonly cacheManager: Cache,
  ) {}

  async login(data: LoginDto, user: any) {
    const payload = { username: data.username, sub: user.id };

    const token = await this.jwtService.signAsync(payload);

    this.logger.log(token, 'auth:service:login: token');
    const expiration = this.configService.get(RedisConfig.EXPIRATION);
    this.logger.log(expiration, 'auth:service:login: expiration');

    // await this.redis.set('user:' + user.id, token, 'EX', expiration);

    await this.cacheManager.set('user:' + user.id, token, expiration * 1000);

    return {
      code: 0,
      message: '登录成功',
      data: {
        username: data.username,
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
    if (user) {
      return user;
    }
    return null;
  }
}
