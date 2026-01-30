import { ExecutionContext, Injectable, Logger, UnauthorizedException } from "@nestjs/common";
import type { Request } from "express";
import { AuthGuard } from "@nestjs/passport";
import { Reflector } from "@nestjs/core";
import { IS_PUBLIC_KEY } from "@/common/decorators/public.decorator";

@Injectable()
export class JwtAuthGuard extends AuthGuard("jwt") {
	private readonly logger = new Logger(JwtAuthGuard.name);

	private static readonly AuthErrorCodes = {
		TOKEN_MISSING: 491,
		TOKEN_EXPIRED: 492,
		TOKEN_NOT_BEFORE: 493,
		TOKEN_INVALID: 494,
		TOKEN_FORMAT: 495,
	};

	constructor(private readonly reflector: Reflector) {
		super();
	}

	canActivate(context: ExecutionContext) {
		const request = context.switchToHttp().getRequest<Request>();
		if (request.path.startsWith("/api/docs") || request.path.startsWith("/api-json")) {
			return true;
		}
		const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
			context.getHandler(),
			context.getClass(),
		]);
		if (isPublic) {
			return true;
		}
		return super.canActivate(context);
	}

	handleRequest<TUser = any>(
		err: any,
		user: any,
		info: any,
		context: ExecutionContext,
		status?: any,
	): TUser {
		const data = {
			err,
			user,
			info,
			// context,
			status,
		};

		this.logger.log(data, "JwtAuthGuard:handleRequest");

		if (info) {
			if (info.name === "TokenExpiredError")
				throw new UnauthorizedException({
					message: "认证已过期，请重新登录",
					code: JwtAuthGuard.AuthErrorCodes.TOKEN_EXPIRED,
				});
			if (info.name === "JsonWebTokenError")
				throw new UnauthorizedException({
					message: "认证格式错误，请重新登录",
					code: JwtAuthGuard.AuthErrorCodes.TOKEN_FORMAT,
				});
			if (info.name === "NotBeforeError")
				throw new UnauthorizedException({
					message: "认证尚未生效，请稍后再试",
					code: JwtAuthGuard.AuthErrorCodes.TOKEN_NOT_BEFORE,
				});
			if (info.name === "TokenInvalidError")
				throw new UnauthorizedException({
					message: "认证无效，请重新登录",
					code: JwtAuthGuard.AuthErrorCodes.TOKEN_INVALID,
				});
		}

		if (!user) {
			throw new UnauthorizedException({
				message: "缺少认证信息",
				code: JwtAuthGuard.AuthErrorCodes.TOKEN_MISSING,
			});
		}

		return user;
	}
}
