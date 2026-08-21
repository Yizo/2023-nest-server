import { Reflector } from "@nestjs/core";
import { AuthErrorCode, AuthUnauthorizedException } from "@/common/errors";
import { JwtAuthGuard } from "@/modules/auth/auth.guards";

describe("JwtAuthGuard", () => {
  const guard = new JwtAuthGuard(new Reflector());

  it.each([
    [new Error("No auth token"), AuthErrorCode.ACCESS_TOKEN_MISSING, "请先登录"],
    [Object.assign(new Error("jwt expired"), { name: "TokenExpiredError" }), AuthErrorCode.ACCESS_TOKEN_EXPIRED, "登录已过期，请重新登录"],
    [Object.assign(new Error("invalid signature"), { name: "JsonWebTokenError" }), AuthErrorCode.ACCESS_TOKEN_INVALID, "登录凭证无效"],
  ])("认证失败时返回可供前端分支处理的业务码", (info, code, message) => {
    try {
      guard.handleRequest(undefined, false, info);
      throw new Error("期望认证失败");
    } catch (error) {
      expect(error).toBeInstanceOf(AuthUnauthorizedException);
      expect((error as AuthUnauthorizedException).getStatus()).toBe(401);
      expect((error as AuthUnauthorizedException).getResponse()).toEqual({ code, message });
    }
  });
});
