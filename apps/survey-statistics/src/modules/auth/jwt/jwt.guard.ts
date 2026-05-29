import {
	ExecutionContext,
	Injectable,
	UnauthorizedException,
} from "@nestjs/common";
import type { Request } from "express";
import { AuthGuard } from "@nestjs/passport";
import { Reflector } from "@nestjs/core";
import { ConfigService } from "@nestjs/config";
import {
	JsonWebTokenError,
	NotBeforeError,
	TokenExpiredError,
} from "jsonwebtoken";
import { IS_PUBLIC_KEY } from "@/common/decorators/public.decorator";
import { JwtErrorCode, JwtErrorMessages } from "@/enums/jwt";

function throwJwtError(code: JwtErrorCode): never {
	throw new UnauthorizedException({
		code,
		message: JwtErrorMessages[code],
	});
}

function isNoAuthTokenInfo(info: unknown): boolean {
	if (!info || typeof info !== "object") {
		return false;
	}
	const message = (info as { message?: string }).message;
	return message === "No auth token";
}

function mapJwtLibraryError(error: unknown): JwtErrorCode | null {
	if (error instanceof TokenExpiredError) {
		return JwtErrorCode.TOKEN_EXPIRED;
	}
	if (error instanceof NotBeforeError) {
		return JwtErrorCode.TOKEN_NOT_BEFORE_INVALID;
	}
	if (error instanceof JsonWebTokenError) {
		return JwtErrorCode.TOKEN_MALFORMED;
	}
	return null;
}

@Injectable()
export class JwtAuthGuard extends AuthGuard("jwt") {
	constructor(
		private readonly reflector: Reflector,
		private readonly configService: ConfigService,
	) {
		super();
	}

	async canActivate(context: ExecutionContext): Promise<boolean> {
		const request = context.switchToHttp().getRequest<Request>();

		if (
			this.configService.get<boolean>("mode.development") &&
			this.isSwaggerPath(request.path)
		) {
			return true;
		}

		const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
			context.getHandler(),
			context.getClass(),
		]);
		if (isPublic) {
			return true;
		}

		return (await super.canActivate(context)) as boolean;
	}

	handleRequest<TUser = any>(err: any, user: TUser, info: any): TUser {
		if (err) {
			if (err instanceof UnauthorizedException) {
				throw err;
			}
			const mapped = mapJwtLibraryError(err);
			if (mapped !== null) {
				throwJwtError(mapped);
			}
			throwJwtError(JwtErrorCode.TOKEN_VERIFICATION_FAILED);
		}

		if (!user) {
			const infoMapped = mapJwtLibraryError(info);
			if (infoMapped !== null) {
				throwJwtError(infoMapped);
			}
			if (isNoAuthTokenInfo(info)) {
				throwJwtError(JwtErrorCode.NO_TOKEN_PROVIDED);
			}
			throwJwtError(JwtErrorCode.TOKEN_VALIDATION_FAILED);
		}

		return user;
	}

	private isSwaggerPath(path: string): boolean {
		return (
			path.startsWith("/api/docs") ||
			path.startsWith("/api-json") ||
			path.startsWith("/api/docs-json")
		);
	}
}
