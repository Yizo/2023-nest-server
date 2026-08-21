import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from "@nestjs/common";
import type { Request } from "express";
import { map, Observable } from "rxjs";

export interface ApiSuccess<T> {
  code: 0;
  message: "成功";
  data: T;
  requestId: string;
  timestamp: string;
}

@Injectable()
export class ApiResponseInterceptor<T> implements NestInterceptor<T, ApiSuccess<T>> {
  intercept(context: ExecutionContext, next: CallHandler<T>): Observable<ApiSuccess<T>> {
    const request = context.switchToHttp().getRequest<Request & { requestId?: string }>();
    // Controller 只返回业务 data；包装格式集中在这里，避免每个接口重复写。
    return next.handle().pipe(
      map((data) => ({
        code: 0,
        message: "成功",
        data,
        requestId: request.requestId ?? "unknown",
        timestamp: new Date().toISOString(),
      })),
    );
  }
}
