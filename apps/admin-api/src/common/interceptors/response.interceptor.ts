import {
	CallHandler,
	ExecutionContext,
	Injectable,
	NestInterceptor,
} from "@nestjs/common";
import { map, type Observable } from "rxjs";
import type { ApiResponse, RequestWithId } from "../types";

/** 将所有成功响应包装成统一的 API 外壳。 */
@Injectable()
export class ResponseInterceptor implements NestInterceptor {
	intercept(context: ExecutionContext, next: CallHandler): Observable<ApiResponse<unknown>> {
		const request = context.switchToHttp().getRequest<RequestWithId>();
		return next.handle().pipe(
			map((data: unknown) => ({
				code: 0,
				message: "成功",
				data: data ?? null,
				requestId: request.requestId ?? "unknown",
				timestamp: new Date().toISOString(),
			})),
		);
	}
}
