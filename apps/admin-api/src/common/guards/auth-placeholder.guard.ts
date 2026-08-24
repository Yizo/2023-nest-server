import {
	CanActivate,
	ExecutionContext,
	Injectable,
	NotImplementedException,
} from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { AUTH_REQUIRED_KEY, PUBLIC_ROUTE_KEY } from "../decorators";

/**
 * 第一版只保留认证扩展点，不实现用户、JWT 或权限业务。
 *
 * 没有标记的路由默认公开；未来标记 @AuthRequired() 后，在真正接入认证
 * 策略之前会明确返回 501，避免把未认证请求误认为已认证请求。
 */
@Injectable()
export class AuthPlaceholderGuard implements CanActivate {
	constructor(private readonly reflector: Reflector) {}

	canActivate(context: ExecutionContext): boolean {
		const isPublic = this.reflector.getAllAndOverride<boolean>(PUBLIC_ROUTE_KEY, [
			context.getHandler(),
			context.getClass(),
		]);
		if (isPublic) return true;

		const authRequired = this.reflector.getAllAndOverride<boolean>(AUTH_REQUIRED_KEY, [
			context.getHandler(),
			context.getClass(),
		]);
		if (!authRequired) return true;

		throw new NotImplementedException("认证模块尚未接入");
	}
}
