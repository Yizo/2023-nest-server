import { SetMetadata } from "@nestjs/common";

/** 路由元数据：明确表示该路由不需要认证。 */
export const PUBLIC_ROUTE_KEY = "admin-api:public-route";
export const Public = () => SetMetadata(PUBLIC_ROUTE_KEY, true);

/** 路由元数据：为未来接入 JWT 时标记需要认证的路由。 */
export const AUTH_REQUIRED_KEY = "admin-api:auth-required";
export const AuthRequired = () => SetMetadata(AUTH_REQUIRED_KEY, true);
