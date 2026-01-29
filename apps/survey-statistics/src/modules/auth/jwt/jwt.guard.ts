import { ExecutionContext, Injectable } from "@nestjs/common";
import type { Request } from "express";
import { AuthGuard } from "@nestjs/passport";
import { Reflector } from "@nestjs/core";
import { IS_PUBLIC_KEY } from "@/common/decorators/public.decorator";

@Injectable()
export class JwtAuthGuard extends AuthGuard("jwt") {
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
}
