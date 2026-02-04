import { CallHandler, ExecutionContext, Injectable, Logger, NestInterceptor } from "@nestjs/common";
import type { Request } from "express";
import type { Observable } from "rxjs";
import { tap } from "rxjs/operators";

@Injectable()
export class LoggingInterceptor implements NestInterceptor {
	constructor(private readonly logger: Logger) {}

	intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
		const request = context.switchToHttp().getRequest<Request>();
		const requestInfo = {
			method: request.method,
			url: request.url,
			params: request.params,
			originalUrl: request.originalUrl,
			protocol: request.protocol,
			hostname: request.hostname,
			subdomains: request.subdomains,
			query: request.query,
			body: request.body,
			ip: request.ip,
			headers: request.headers,
		};

		const now = Date.now();

		return next.handle().pipe(
			tap((response) => {
				const payload = response as { code?: number };
				if (payload && typeof payload === "object" && payload.code === 0) {
					this.logger.log(
						{
							request: requestInfo,
							response,
							duration: `${Date.now() - now}ms`,
						},
						"请求响应拦截器"
					);
				}
			})
		);
	}
}
