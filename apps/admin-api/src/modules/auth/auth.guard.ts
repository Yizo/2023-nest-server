import {
	CanActivate,
	ExecutionContext,
	Injectable,
	UnauthorizedException,
} from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import type { AuthenticatedUser } from "@/common/types";
import {
	AUTH_REQUIRED_KEY,
	PERMISSIONS_KEY,
	PUBLIC_ROUTE_KEY,
} from "@/common/decorators";
import { AuthService } from "./auth.service";

interface AuthRequest {
	headers: { authorization?: string };
	user?: AuthenticatedUser;
}

/** 全局认证守卫：只处理 Public / JWT，不校验操作权限。未标注路由默认拒绝。 */
@Injectable()
export class AuthGuard implements CanActivate {
	constructor(
		private readonly reflector: Reflector,
		private readonly auth: AuthService,
	) {}

	async canActivate(context: ExecutionContext): Promise<boolean> {
		const isPublic = this.reflector.getAllAndOverride<boolean>(PUBLIC_ROUTE_KEY, [
			context.getHandler(),
			context.getClass(),
		]);
		if (isPublic) return true;

		const authRequired = this.reflector.getAllAndOverride<boolean>(AUTH_REQUIRED_KEY, [
			context.getHandler(),
			context.getClass(),
		]);
		const requiredPermissions =
			this.reflector.getAllAndOverride<string[]>(PERMISSIONS_KEY, [
				context.getHandler(),
				context.getClass(),
			]) ?? [];
		if (!authRequired && !requiredPermissions.length) {
			throw new UnauthorizedException("未声明认证要求");
		}

		const request = context.switchToHttp().getRequest<AuthRequest>();
		const token = this.extractBearerToken(request.headers.authorization);
		if (!token) throw new UnauthorizedException("缺少 Bearer Token");
		request.user = await this.auth.validateAccessToken(token);
		return true;
	}

	private extractBearerToken(authorization?: string): string | undefined {
		const [type, token] = authorization?.split(" ") ?? [];
		return type === "Bearer" && token ? token : undefined;
	}
}
