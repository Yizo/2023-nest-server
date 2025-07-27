import {
  ExecutionContext,
  Injectable,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Observable } from 'rxjs';
import {
  JsonWebTokenError,
  TokenExpiredError,
  NotBeforeError,
} from 'jsonwebtoken';
import { JwtErrorCode, JwtErrorMessages } from '@/enums/jwt';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  constructor(private readonly logger: Logger) {
    super();
  }

  canActivate(
    context: ExecutionContext,
  ): boolean | Promise<boolean> | Observable<boolean> {
    const request = context.switchToHttp().getRequest();
    const token = request.headers.authorization;
    this.logger.log(token, 'jwt-auth.guard:token');
    // 策略验证
    return super.canActivate(context);
  }

  /**
   * 在策略验证后,对返回的结果做最后的处理
   */
  handleRequest(err: any, user: any, info: any, context: ExecutionContext) {
    const request = context.switchToHttp().getRequest();

    // 如果没有token
    if (!request.headers.authorization) {
      this.logger.warn('No token provided', 'jwt-auth.guard');
      throw new UnauthorizedException({
        code: JwtErrorCode.NO_TOKEN_PROVIDED,
        message: JwtErrorMessages[JwtErrorCode.NO_TOKEN_PROVIDED],
      });
    }

    // 如果有错误
    if (err) {
      this.logger.error(`JWT Error: ${err.message}`, 'jwt-auth.guard');

      // Token过期
      if (err instanceof TokenExpiredError) {
        throw new UnauthorizedException({
          code: JwtErrorCode.TOKEN_EXPIRED,
          message: JwtErrorMessages[JwtErrorCode.TOKEN_EXPIRED],
          expiredAt: err.expiredAt,
          details: {
            expiredAt: err.expiredAt,
            currentTime: new Date(),
          },
        });
      }

      // Token尚未生效
      if (err instanceof NotBeforeError) {
        throw new UnauthorizedException({
          code: JwtErrorCode.TOKEN_NOT_BEFORE_INVALID,
          message: JwtErrorMessages[JwtErrorCode.TOKEN_NOT_BEFORE_INVALID],
          details: {
            date: err.date,
            currentTime: new Date(),
          },
        });
      }

      // Token格式错误或签名无效
      if (err instanceof JsonWebTokenError) {
        let errorCode = JwtErrorCode.TOKEN_INVALID;
        const additionalDetails = {};

        // 根据具体的JWT错误类型设置不同的错误码
        switch (err.name) {
          case 'JsonWebTokenError':
            errorCode = JwtErrorCode.TOKEN_MALFORMED;
            break;
          case 'TokenExpiredError':
            errorCode = JwtErrorCode.TOKEN_EXPIRED;
            break;
          case 'NotBeforeError':
            errorCode = JwtErrorCode.TOKEN_NOT_BEFORE_INVALID;
            break;
          default:
            errorCode = JwtErrorCode.TOKEN_INVALID;
        }

        throw new UnauthorizedException({
          code: errorCode,
          message: JwtErrorMessages[errorCode],
          error: err.message,
          details: additionalDetails,
        });
      }

      // 其他JWT错误
      throw new UnauthorizedException({
        code: JwtErrorCode.TOKEN_VERIFICATION_FAILED,
        message: JwtErrorMessages[JwtErrorCode.TOKEN_VERIFICATION_FAILED],
        error: err.message,
      });
    }

    // 如果验证失败但没有具体错误信息
    if (!user) {
      this.logger.warn(
        'Token validation failed - no user returned',
        'jwt-auth.guard',
      );
      throw new UnauthorizedException({
        code: JwtErrorCode.TOKEN_VALIDATION_FAILED,
        message: JwtErrorMessages[JwtErrorCode.TOKEN_VALIDATION_FAILED],
      });
    }

    // 验证成功，返回用户信息
    this.logger.log(`User authenticated: ${user.username}`, 'jwt-auth.guard');
    return user;
  }
}
