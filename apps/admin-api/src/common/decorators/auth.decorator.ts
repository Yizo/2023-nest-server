import { createParamDecorator, ExecutionContext, SetMetadata, applyDecorators } from "@nestjs/common";
import type { AuthenticatedUser } from "@/common/types";

/** 路由元数据：明确表示该路由不需要认证。 */
export const PUBLIC_ROUTE_KEY = "admin-api:public-route";
export const Public = () => SetMetadata(PUBLIC_ROUTE_KEY, true);

/** 路由元数据：为未来接入 JWT 时标记需要认证的路由。 */
export const AUTH_REQUIRED_KEY = "admin-api:auth-required";
export const AuthRequired = () => SetMetadata(AUTH_REQUIRED_KEY, true);

/** 路由元数据：要求当前用户拥有指定的全部操作权限。 */
export const PERMISSIONS_KEY = "admin-api:permissions";
export const RequirePermissions = (...permissions: string[]) =>
	applyDecorators(SetMetadata(PERMISSIONS_KEY, permissions), AuthRequired());

/** 从当前请求中取出已经通过认证的用户。 */
export const CurrentUser = createParamDecorator(
	(_data: unknown, context: ExecutionContext): AuthenticatedUser =>
		context.switchToHttp().getRequest<{ user: AuthenticatedUser }>().user,
);
