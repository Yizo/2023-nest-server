import {
	CanActivate,
	ExecutionContext,
	Injectable,
	UnauthorizedException,
} from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import type { AuthenticatedUser } from "@/common/types";
import { PERMISSIONS_KEY, PUBLIC_ROUTE_KEY } from "@/common/decorators";
import { PermissionService } from "./permission.service";

interface AuthRequest {
	user?: AuthenticatedUser;
}

/** 只校验 @RequirePermissions；没有该元数据则放行。 */
@Injectable()
export class PermissionGuard implements CanActivate {
	constructor(
		private readonly reflector: Reflector,
		private readonly permissions: PermissionService,
	) {}

	async canActivate(context: ExecutionContext): Promise<boolean> {
		const isPublic = this.reflector.getAllAndOverride<boolean>(PUBLIC_ROUTE_KEY, [
			context.getHandler(),
			context.getClass(),
		]);
		if (isPublic) return true;

		const required =
			this.reflector.getAllAndOverride<string[]>(PERMISSIONS_KEY, [
				context.getHandler(),
				context.getClass(),
			]) ?? [];
		if (!required.length) return true;

		const request = context.switchToHttp().getRequest<AuthRequest>();
		if (!request.user) throw new UnauthorizedException("缺少 Bearer Token");
		await this.permissions.assertPermissions(request.user.id, required);
		return true;
	}
}
