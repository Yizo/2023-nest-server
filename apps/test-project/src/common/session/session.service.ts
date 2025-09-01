import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { SessionOptions } from 'express-session';
import { ModeConfig, SessionConfig } from 'src/enums';
@Injectable()
export class SessionService {
  constructor(private readonly configService: ConfigService) {}

  async getSessionConfig(): Promise<SessionOptions> {
    const isDevelopment = this.configService.get(ModeConfig.DEVELOPMENT);
    const sessionSecret = this.configService.getOrThrow<string>(
      SessionConfig.SECRET,
    );

    // 基础配置
    const baseConfig: SessionOptions = {
      secret: sessionSecret,
      resave: false,
      saveUninitialized: false,
      cookie: {
        secure: isDevelopment,
        sameSite: isDevelopment ? 'lax' : 'strict',
        httpOnly: true,
      },
    };

    // 生产环境添加 Redis 存储
    if (!isDevelopment) {
      return baseConfig;
    }

    // 开发环境配置
    return {
      ...baseConfig,
      saveUninitialized: true,
    };
  }
}
