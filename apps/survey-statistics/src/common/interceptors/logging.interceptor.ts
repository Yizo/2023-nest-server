import { CallHandler, ExecutionContext, Injectable, Logger, NestInterceptor } from "@nestjs/common";
import type { Request } from "express";
import type { Observable } from "rxjs";
import { tap } from "rxjs/operators";

@Injectable()
export class LoggingInterceptor implements NestInterceptor {
	private readonly logger = new Logger(LoggingInterceptor.name);

	intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
		const request = context.switchToHttp().getRequest<Request>();
		const requestInfo = {
			method: request.method,
			url: request.url,
			params: request.params,
			query: request.query,
			body: request.body,
		};

		const now = Date.now();

		return next.handle().pipe(
			tap((response) => {
				this.logger.log(
					{
						request: requestInfo,
						response,
						duration: `${Date.now() - now}ms`,
					},
					"接口日志",
				);
			}),
		);
	}
}
