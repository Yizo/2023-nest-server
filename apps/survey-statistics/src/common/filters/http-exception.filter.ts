import {
	ArgumentsHost,
	Catch,
	ExceptionFilter,
	HttpException,
	HttpStatus,
	Logger,
} from "@nestjs/common";
import type { Request, Response } from "express";

interface HttpErrorBody {
	message?: string | string[];
	error?: string;
	code?: string | number;
}

interface NormalizedError {
	/** 传输层状态码，仅用于 response.status() */
	httpStatus: number;
	/** 展示给前端的文案 */
	message: string;
	/** 抛出方自带的业务错误码（如鉴权 1001/1005），无则回退到 httpStatus */
	businessCode?: number;
}

/**
 * 全局异常过滤器：只负责「整理 + 展示」错误。
 *
 * 职责边界：
 * - 不感知任何具体业务语义（不认识 JWT/校验等具体 code）。
 * - 业务错误码由抛出方（如鉴权 guard/strategy、各 service）在异常 body 的 `code` 里给出，这里原样透传。
 * - 传输层 HTTP 状态与展示用业务 code 相互独立：response.status 用 httpStatus，响应体 code 用业务码。
 */
@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
	private readonly logger = new Logger(HttpExceptionFilter.name);

	catch(exception: unknown, host: ArgumentsHost) {
		const ctx = host.switchToHttp();
		const response = ctx.getResponse<Response>();
		const request = ctx.getRequest<Request>();

		const { httpStatus, message, businessCode } = this.normalize(exception);

		const errorResponse = {
			code: businessCode ?? httpStatus,
			message,
			data: null,
			timestamp: new Date().toISOString(),
		};

		this.logger.error(
			{
				request: this.buildRequestInfo(request),
				response: errorResponse,
			},
			"全局异常过滤器"
		);

		response.status(httpStatus).json(errorResponse);
	}

	/** 把任意异常归一化成 {httpStatus, message, businessCode}，不做任何业务判断 */
	private normalize(exception: unknown): NormalizedError {
		if (exception instanceof HttpException) {
			const httpStatus = exception.getStatus();
			const errorBody = exception.getResponse() as HttpErrorBody | string;

			if (typeof errorBody === "string") {
				return { httpStatus, message: errorBody };
			}

			return {
				httpStatus,
				message: this.resolveMessage(errorBody),
				businessCode: this.resolveBusinessCode(errorBody),
			};
		}

		if (exception instanceof Error && exception.message) {
			return {
				httpStatus: HttpStatus.INTERNAL_SERVER_ERROR,
				message: exception.message,
			};
		}

		return {
			httpStatus: HttpStatus.INTERNAL_SERVER_ERROR,
			message: "Internal server error",
		};
	}

	private resolveMessage(errorBody: HttpErrorBody): string {
		if (Array.isArray(errorBody.message)) {
			return errorBody.message.join(", ");
		}
		if (errorBody.message) {
			return errorBody.message;
		}
		if (errorBody.error) {
			return errorBody.error;
		}
		return "Internal server error";
	}

	private resolveBusinessCode(errorBody: HttpErrorBody): number | undefined {
		if (errorBody.code === undefined || errorBody.code === null) {
			return undefined;
		}
		const code = Number(errorBody.code);
		return Number.isNaN(code) ? undefined : code;
	}

	private buildRequestInfo(request: Request) {
		const userId =
			(request as any).user?.id || (request as any).user?.userId || null;

		return {
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
			userId,
		};
	}
}
