import { ArgumentsHost, Catch, ExceptionFilter, HttpException, HttpStatus, Logger } from "@nestjs/common";
import type { Request, Response } from "express";

interface ExceptionBody {
  message?: string | string[];
  error?: string;
  code?: number;
}

const STATUS_MESSAGES: Record<number, string> = {
  400: "请求参数不正确",
  401: "请先登录",
  403: "没有执行该操作的权限",
  404: "资源不存在",
  409: "资源冲突",
  413: "请求内容过大",
  429: "请求过于频繁，请稍后再试",
};

const FRAMEWORK_MESSAGES: Record<string, string> = {
  Unauthorized: "请先登录",
  UNAUTHORIZED: "请先登录",
  Forbidden: "没有执行该操作的权限",
  FORBIDDEN: "没有执行该操作的权限",
  "Not Found": "资源不存在",
  NOT_FOUND: "资源不存在",
  "Bad Request": "请求参数不正确",
  BAD_REQUEST: "请求参数不正确",
  Conflict: "资源冲突",
  CONFLICT: "资源冲突",
  "Too Many Requests": "请求过于频繁，请稍后再试",
  TOO_MANY_REQUESTS: "请求过于频繁，请稍后再试",
  "Internal Server Error": "服务暂时不可用",
  INTERNAL_SERVER_ERROR: "服务暂时不可用",
  "Service Unavailable": "服务暂时不可用",
  SERVICE_UNAVAILABLE: "服务暂时不可用",
  "Payload Too Large": "请求内容过大",
  "jwt expired": "登录已过期，请重新登录",
  "invalid token": "登录凭证无效",
  "jwt malformed": "登录凭证无效",
  "invalid signature": "登录凭证无效",
  "No auth token": "请先登录",
};

function toClientMessage(status: number, rawMessage: string | undefined, validationErrors?: string[]): string {
  if (status >= 500) return "服务暂时不可用";
  if (validationErrors) return "请求参数不正确";
  if (!rawMessage) return STATUS_MESSAGES[status] ?? "请求失败";
  if (FRAMEWORK_MESSAGES[rawMessage]) return FRAMEWORK_MESSAGES[rawMessage];
  if (/^Cannot (GET|POST|PUT|PATCH|DELETE|HEAD|OPTIONS) /i.test(rawMessage)) return "接口不存在";
  if (/too many requests/i.test(rawMessage)) return "请求过于频繁，请稍后再试";
  return rawMessage;
}

@Catch()
export class ApiExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(ApiExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const http = host.switchToHttp();
    const request = http.getRequest<Request & { requestId?: string }>();
    const response = http.getResponse<Response>();
    // HttpException 是可预期业务错误；普通 Error 统一隐藏细节并返回 500。
    const status = exception instanceof HttpException ? exception.getStatus() : HttpStatus.INTERNAL_SERVER_ERROR;
    const raw = exception instanceof HttpException ? exception.getResponse() : null;
    const body = typeof raw === "object" && raw !== null ? (raw as ExceptionBody) : {};
    const rawMessage = typeof raw === "string" ? raw : body.message;
    const validationErrors = Array.isArray(rawMessage) ? rawMessage : undefined;
    // Nest/Passport 默认英文文案在这里统一换成中文；业务层已写中文的提示原样返回。
    const message = toClientMessage(
      status,
      typeof rawMessage === "string" ? rawMessage : undefined,
      validationErrors,
    );

    const logPayload = JSON.stringify({
      event: "http_error",
      requestId: request.requestId,
      method: request.method,
      path: request.originalUrl,
      statusCode: status,
      businessCode: body.code ?? null,
      message,
      error: status >= 500 ? (exception instanceof Error ? exception.stack : String(exception)) : undefined,
    });

    if (status >= 500) {
      this.logger.error(logPayload);
    } else this.logger.warn(logPayload);

    response.status(status).json({
      code: body.code ?? status,
      message,
      data: validationErrors ? { errors: validationErrors } : null,
      requestId: request.requestId ?? "unknown",
      timestamp: new Date().toISOString(),
    });
  }
}
