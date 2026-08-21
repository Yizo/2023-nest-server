import { BadRequestException, ForbiddenException, Logger, NotFoundException, UnauthorizedException } from "@nestjs/common";
import type { ArgumentsHost } from "@nestjs/common";
import { jest } from "@jest/globals";
import { ApiExceptionFilter } from "@/common/filters/api-exception.filter";
import { AuthErrorCode, AuthUnauthorizedException } from "@/common/errors";

describe("ApiExceptionFilter", () => {
  function host() {
    const json = jest.fn();
    const status = jest.fn(() => ({ json }));
    const argumentsHost = {
      switchToHttp: () => ({
        getRequest: () => ({ requestId: "request-1", method: "POST", originalUrl: "/example" }),
        getResponse: () => ({ status }),
      }),
    } as unknown as ArgumentsHost;
    return { argumentsHost, status, json };
  }

  it("uses the HTTP status as the compact error code", () => {
    const target = host();

    new ApiExceptionFilter().catch(new BadRequestException(["email must be an email"]), target.argumentsHost);

    expect(target.status).toHaveBeenCalledWith(400);
    expect(target.json).toHaveBeenCalledWith(expect.objectContaining({
      code: 400,
      message: "请求参数不正确",
      data: { errors: ["email must be an email"] },
      requestId: "request-1",
    }));
  });

  it("does not leak unexpected error details", () => {
    const target = host();
    const logger = jest.spyOn(Logger.prototype, "error").mockImplementation((_message: unknown) => undefined);

    new ApiExceptionFilter().catch(new Error("database password leaked"), target.argumentsHost);

    expect(target.status).toHaveBeenCalledWith(500);
    expect(target.json).toHaveBeenCalledWith(expect.objectContaining({
      code: 500,
      message: "服务暂时不可用",
      data: null,
    }));
    logger.mockRestore();
  });

  it("将 Nest 默认英文 Unauthorized 转成中文", () => {
    const target = host();

    new ApiExceptionFilter().catch(new UnauthorizedException(), target.argumentsHost);

    expect(target.status).toHaveBeenCalledWith(401);
    expect(target.json).toHaveBeenCalledWith(expect.objectContaining({
      code: 401,
      message: "请先登录",
      data: null,
    }));
  });

  it("HTTP 状态保持 401，同时透传认证业务码", () => {
    const target = host();
    new ApiExceptionFilter().catch(
      new AuthUnauthorizedException(AuthErrorCode.ACCESS_TOKEN_EXPIRED),
      target.argumentsHost,
    );
    expect(target.status).toHaveBeenCalledWith(401);
    expect(target.json).toHaveBeenCalledWith(expect.objectContaining({
      code: AuthErrorCode.ACCESS_TOKEN_EXPIRED,
      message: "登录已过期，请重新登录",
    }));
  });

  it("保留业务层已经写好的中文异常文案", () => {
    const target = host();

    new ApiExceptionFilter().catch(new UnauthorizedException("用户名或密码不正确"), target.argumentsHost);

    expect(target.json).toHaveBeenCalledWith(expect.objectContaining({
      code: 401,
      message: "用户名或密码不正确",
    }));
  });

  it("将默认 Forbidden 和未匹配路由转成中文", () => {
    const forbidden = host();
    new ApiExceptionFilter().catch(new ForbiddenException(), forbidden.argumentsHost);
    expect(forbidden.json).toHaveBeenCalledWith(expect.objectContaining({
      code: 403,
      message: "没有执行该操作的权限",
    }));

    const missing = host();
    new ApiExceptionFilter().catch(new NotFoundException("Cannot GET /api/missing"), missing.argumentsHost);
    expect(missing.json).toHaveBeenCalledWith(expect.objectContaining({
      code: 404,
      message: "接口不存在",
    }));
  });
});
