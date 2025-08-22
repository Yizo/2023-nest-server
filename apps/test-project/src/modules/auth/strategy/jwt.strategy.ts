import { Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { JwtConfig, TOKEN_KEY } from '@/enums/jwt';
import { UserService } from '@/modules/user/user.service';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  private readonly logger = new Logger(JwtStrategy.name);

  constructor(
    protected configService: ConfigService,
    private readonly userService: UserService,
  ) {
    /**
     * 提取token, 验证签名, 成功后调用 validate 方法
     */

    // 先获取配置值
    const secret = configService.get<string>(JwtConfig.SECRET, '');

    super({
      jwtFromRequest: ExtractJwt.fromExtractors([
        ExtractJwt.fromAuthHeaderAsBearerToken(),
        (request) => {
          return request.headers[TOKEN_KEY] ?? '';
        },
      ]),
      ignoreExpiration: false,
      secretOrKey: secret,
    });
  }

  /**
   * 验证成功后, 返回用户信息挂载到 request.user 上.
   * 在这里进行用户有效性验证
   */
  async validate(payload: any) {
    const user = await this.userService.findOne(payload.sub);
    if (!user) {
      throw new UnauthorizedException('用户不存在');
    }
    // 返回用户信息
    return user;
  }
}
