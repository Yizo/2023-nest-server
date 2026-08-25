import {
	CallHandler,
	ExecutionContext,
	Injectable,
	Logger,
	NestInterceptor,
} from "@nestjs/common";
import { catchError, tap, throwError, type Observable } from "rxjs";
import type { RequestWithId } from "@/common/types";

/** 记录 HTTP 请求耗时和结果；请求体不写入日志，避免误记业务敏感数据。 */
@Injectable()
export class RequestLoggingInterceptor implements NestInterceptor {
	private readonly logger = new Logger(RequestLoggingInterceptor.name);

	intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
		const http = context.switchToHttp();
		const request = http.getRequest<RequestWithId>();
		const response = http.getResponse<{ statusCode: number }>();
		const startedAt = Date.now();

		return next.handle().pipe(
			tap(() => {
				this.logger.log(
					JSON.stringify({
						event: "http_request",
						requestId: request.requestId,
						method: request.method,
						// 只记录路径，不记录可能含有敏感参数的完整 query string。
						path: request.path,
						statusCode: response.statusCode,
						durationMs: Date.now() - startedAt,
					}),
				);
			}),
			catchError((error: unknown) => {
				const statusCode = error && typeof (error as { getStatus?: unknown }).getStatus === "function"
					? (error as { getStatus: () => number }).getStatus()
					: 500;
				const logMessage = JSON.stringify({
					event: "http_request_failed",
					requestId: request.requestId,
					method: request.method,
					path: request.path,
					statusCode,
					durationMs: Date.now() - startedAt,
					error: error instanceof Error ? error.message : String(error),
				});
				// 客户端输入造成的 4xx 是预期失败；只有服务端 5xx 进入 error 日志。
				if (statusCode >= 500) this.logger.error(logMessage);
				else this.logger.warn(logMessage);
				return throwError(() => error);
			}),
		);
	}
}
