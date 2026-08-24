import {
	ArgumentsHost,
	Catch,
	HttpException,
	Injectable,
	Logger,
} from "@nestjs/common";
import type { Response } from "express";
import type { ApiResponse, RequestWithId } from "../types";

type ExceptionBody = string | Record<string, unknown>;

const FRAMEWORK_DEFAULT_MESSAGES = new Set([
	"Bad Request",
	"Unauthorized",
	"Forbidden resource",
	"Not Found",
	"Method Not Allowed",
	"Conflict",
	"Payload Too Large",
	"Too Many Requests",
	"Internal Server Error",
	"Not Implemented",
	"Service Unavailable",
]);

function defaultMessage(statusCode: number): string {
	if (statusCode === 400) return "请求参数不正确";
	if (statusCode === 401) return "未认证";
	if (statusCode === 403) return "没有权限";
	if (statusCode === 404) return "资源不存在";
	if (statusCode === 405) return "请求方法不支持";
	if (statusCode === 409) return "请求冲突";
	if (statusCode === 413) return "请求内容过大";
	if (statusCode === 429) return "请求过于频繁";
	if (statusCode === 501) return "功能尚未接入";
	if (statusCode === 503) return "服务暂不可用";
	if (statusCode >= 500) return "服务器内部错误";
	return "请求失败";
}

function firstMessage(value: unknown): string | undefined {
	if (typeof value === "string" && value.trim()) return value;
	if (Array.isArray(value)) {
		for (const item of value) {
			const message = firstMessage(item);
			if (message) return message;
		}
	}
	return undefined;
}

/** 识别 Nest/Express 自动生成的英文消息，让响应统一回落到中文文案。 */
function isFrameworkDefaultMessage(message: string): boolean {
	if (/^Cannot\s+(GET|POST|PUT|PATCH|DELETE|OPTIONS|HEAD)\s+/i.test(message)) return true;
	return FRAMEWORK_DEFAULT_MESSAGES.has(message);
}

function readExceptionBody(exception: HttpException, statusCode: number): { message: string; data: unknown | null } {
	const body = exception.getResponse() as ExceptionBody;
	if (typeof body === "string") {
		return {
			message: isFrameworkDefaultMessage(body) ? defaultMessage(statusCode) : body,
			data: null,
		};
	}
	const candidate = firstMessage(body.message) ?? firstMessage(body.error);
	return {
		message:
			candidate && !isFrameworkDefaultMessage(candidate)
				? candidate
				: defaultMessage(statusCode),
		data: body.data ?? null,
	};
}

/** 将所有异常转换为统一响应，同时隐藏未知异常的内部细节。 */
@Injectable()
@Catch()
export class HttpExceptionFilter {
	private readonly logger = new Logger(HttpExceptionFilter.name);

	catch(exception: unknown, host: ArgumentsHost): void {
		const context = host.switchToHttp();
		const response = context.getResponse<Response>();
		const request = context.getRequest<RequestWithId>();
		const statusCode = exception instanceof HttpException ? exception.getStatus() : 500;
		const errorBody = exception instanceof HttpException
			? readExceptionBody(exception, statusCode)
			: { message: defaultMessage(statusCode), data: null };

		// 只有未知异常才属于真正的未捕获错误；显式抛出的 503 等 HttpException
		// 会由请求日志记录，避免 readiness 失败被重复标成未处理异常。
		if (!(exception instanceof HttpException)) {
			this.logger.error(
				JSON.stringify({
					event: "unhandled_exception",
					requestId: request.requestId,
					method: request.method,
					path: request.path,
					error: exception instanceof Error ? exception.stack ?? exception.message : String(exception),
				}),
			);
		}

		const payload: ApiResponse<unknown> = {
			code: statusCode,
			message: errorBody.message,
			data: errorBody.data,
			requestId: request.requestId ?? "unknown",
			timestamp: new Date().toISOString(),
		};
		response.status(statusCode).json(payload);
	}
}
