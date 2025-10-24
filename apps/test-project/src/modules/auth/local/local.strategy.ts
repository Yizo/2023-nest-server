import { Injectable, UnauthorizedException } from '@nestjs/common';
import { Strategy } from 'passport-local';
import { PassportStrategy } from '@nestjs/passport';
import { AuthService } from '../auth.service';

/**
 * LocalStrategy - 本地认证策略
 *
 * ===== Strategy职责：具体的认证逻辑 =====
 * 1. 被Passport调用，执行实际的用户认证
 * 2. 接收从请求体提取的username和password参数
 * 3. 调用业务服务验证用户凭据
 * 4. 返回用户信息（成功）或抛出异常（失败）
 *
 * ===== 与Guard的区别 =====
 * - Guard：关注"是否允许访问"（访问控制层）
 * - Strategy：关注"如何验证身份"（认证逻辑层）
 */
@Injectable()
export class LocalStrategy extends PassportStrategy(Strategy) {
  constructor(private authService: AuthService) {
    super({
      // 配置从请求体中提取字段的字段名
      usernameField: 'username',
      passwordField: 'password',
    });
  }

  /**
   * validate方法 - Passport调用的核心认证方法
   *
   * @param username - 从请求体提取的用户名
   * @param password - 从请求体提取的密码
   * @returns 用户信息对象（如果认证成功）
   * @throws UnauthorizedException（如果认证失败）
   */
  async validate(username: string, password: string) {
    console.log('LocalStrategy:validate', username, password);

    // ===== Strategy的核心职责：验证用户凭据 =====
    // 1. 调用业务服务进行用户验证
    // 2. 成功：返回用户信息，会被添加到request.user
    // 3. 失败：抛出异常，会被Guard捕获并处理
    const user = await this.authService.validateUser(username, password);
    if (!user) {
      throw new UnauthorizedException({
        message: '账号或密码错误',
      });
    }
    return user;
  }
}
