import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { JwtConfig } from '@/enums/jwt';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(protected configService: ConfigService) {
    /**
     * 提取token, 验证签名, 成功后调用 validate 方法
     */
    super({
      jwtFromRequest: ExtractJwt.fromExtractors([
        ExtractJwt.fromAuthHeaderAsBearerToken(),
        ExtractJwt.fromUrlQueryParameter('token'),
        ExtractJwt.fromHeader('token'),
      ]),
      ignoreExpiration: false,
      secretOrKey: configService.get<string>(JwtConfig.SECRET, ''),
    });
  }

  // 验证成功后, 返回用户信息挂载到 request.user 上.
  // 后续进入管道, 拦截器的流程
  async validate(payload: any) {
    // payload 是从 JWT token 解码出来的数据
    return { userId: payload.sub, username: payload.username };
  }
}
