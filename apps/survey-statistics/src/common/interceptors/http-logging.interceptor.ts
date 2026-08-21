import { CallHandler, ExecutionContext, Injectable, Logger, NestInterceptor } from "@nestjs/common";
import type { Request, Response } from "express";
import type { AuthenticatedUser } from "@/common/types/auth.types";
import { finalize, Observable } from "rxjs";

@Injectable()
export class HttpLoggingInterceptor implements NestInterceptor {
  private readonly logger = new Logger("HTTP");

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    // finalize 无论请求成功还是抛异常都会执行，保证每个请求都有耗时日志。
    const http = context.switchToHttp();
    const request = http.getRequest<Request & { requestId?: string; user?: AuthenticatedUser }>();
    const response = http.getResponse<Response>();
    const startedAt = Date.now();
    return next.handle().pipe(finalize(() => {
      this.logger.log(JSON.stringify({
        event: "http_request",
        requestId: request.requestId,
        method: request.method,
        path: request.originalUrl,
        statusCode: response.statusCode,
        userId: request.user?.id ?? null,
        ip: request.ip,
        durationMs: Date.now() - startedAt,
      }));
    }));
  }
}
