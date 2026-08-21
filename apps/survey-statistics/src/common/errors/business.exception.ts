import { UnauthorizedException } from "@nestjs/common";
import { AuthErrorCode, AuthErrorMessage } from "./auth-error-code";

/** HTTP 状态仍为 401，响应体 code 使用认证业务码。 */
export class AuthUnauthorizedException extends UnauthorizedException {
  constructor(code: AuthErrorCode, message = AuthErrorMessage[code]) {
    super({ code, message });
  }
}
