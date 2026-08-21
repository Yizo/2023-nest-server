import { CanActivate, ExecutionContext, ForbiddenException, HttpException, Injectable } from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { AuthGuard } from "@nestjs/passport";
import type { Request } from "express";
import { IS_PUBLIC_KEY, PERMISSIONS_KEY } from "@/common/decorators";
import type { AuthenticatedUser } from "@/common/types/auth.types";
import { AuthorizationService } from "@/modules/identity/authorization.service";
import { AuthErrorCode, AuthUnauthorizedException } from "@/common/errors";

@Injectable()
export class JwtAuthGuard extends AuthGuard("jwt") {
  constructor(private readonly reflector: Reflector) { super(); }

  override canActivate(context: ExecutionContext) {
    // Public metadata 只跳过 JWT；没有 Public 的接口必须先得到 request.user。
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [context.getHandler(), context.getClass()]);
    return isPublic ? true : super.canActivate(context);
  }

  override handleRequest<TUser>(err: unknown, user: TUser, info?: Error | string): TUser {
    if (err instanceof HttpException) throw err;
    if (err) throw err;
    if (user) return user;

    const detail = typeof info === "string" ? info : info?.message ?? info?.name ?? "";
    const name = info instanceof Error ? info.name : "";
    if (name === "TokenExpiredError" || /expired/i.test(detail)) {
      throw new AuthUnauthorizedException(AuthErrorCode.ACCESS_TOKEN_EXPIRED);
    }
    if (/No auth token/i.test(detail)) {
      throw new AuthUnauthorizedException(AuthErrorCode.ACCESS_TOKEN_MISSING);
    }
    throw new AuthUnauthorizedException(AuthErrorCode.ACCESS_TOKEN_INVALID);
  }
}

@Injectable()
export class PermissionGuard implements CanActivate {
  constructor(private readonly reflector: Reflector, private readonly authorization: AuthorizationService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    // 权限声明放在 Controller 上，Guard 统一读取并交给 AuthorizationService 查询。
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [context.getHandler(), context.getClass()]);
    if (isPublic) return true;
    const permissions = this.reflector.getAllAndOverride<string[]>(PERMISSIONS_KEY, [context.getHandler(), context.getClass()]) ?? [];
    if (permissions.length === 0) return true;
    const request = context.switchToHttp().getRequest<Request & { user?: AuthenticatedUser }>();
    if (!request.user || !(await this.authorization.hasAllPermissions(request.user.id, permissions))) {
      throw new ForbiddenException("没有执行该操作的权限");
    }
    return true;
  }
}
