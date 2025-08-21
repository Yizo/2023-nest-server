import {
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Observable } from 'rxjs';
import { Reflector } from '@nestjs/core';
import {
  JsonWebTokenError,
  TokenExpiredError,
  NotBeforeError,
} from 'jsonwebtoken';
import { IS_PUBLIC_KEY, JwtErrorCode, JwtErrorMessages } from '@/enums/jwt';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  constructor(private readonly reflector: Reflector) {
    super();
  }

  canActivate(
    context: ExecutionContext,
  ): boolean | Promise<boolean> | Observable<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) {
      return true;
    }
    return super.canActivate(context);
  }

  /**
   * 在策略验证后,对返回的结果做最后的处理
   */
  handleRequest(err: any, user: any, info: any, context: ExecutionContext) {
    const request = context.switchToHttp().getRequest();

    // 如果有错误
    if (err) {
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
      throw new UnauthorizedException({
        code: JwtErrorCode.TOKEN_VALIDATION_FAILED,
        message: JwtErrorMessages[JwtErrorCode.TOKEN_VALIDATION_FAILED],
      });
    }
    return user;
  }
}
