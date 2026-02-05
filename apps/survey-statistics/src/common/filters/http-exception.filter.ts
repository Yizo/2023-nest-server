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

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
	private readonly logger = new Logger(HttpExceptionFilter.name);
	catch(exception: unknown, host: ArgumentsHost) {
		const ctx = host.switchToHttp();
		const response = ctx.getResponse<Response>();
		const request = ctx.getRequest<Request>();

		let status = HttpStatus.INTERNAL_SERVER_ERROR;
		let message = "Internal server error";

		if (exception instanceof HttpException) {
			status = exception.getStatus();
			const errorBody = exception.getResponse() as HttpErrorBody | string;
			if (typeof errorBody === "string") {
				message = errorBody;
			} else if (errorBody) {
				if (Array.isArray(errorBody.message)) {
					message = errorBody.message.join(", ");
				} else if (errorBody.message) {
					message = errorBody.message;
				} else if (errorBody.error) {
					message = errorBody.error;
				}
				if ("code" in errorBody) {
					status = errorBody.code as HttpStatus;
				}
			}
		} else if (exception instanceof Error && exception.message) {
			message = exception.message;
		}

		const errorResponse = {
			code: status,
			message,
			data: null,
			timestamp: new Date().toISOString(),
		};

		const userId = (request as any).user?.id || (request as any).user?.userId || null;

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
			userId,
		};

		this.logger.error(
			{
				request: requestInfo,
				response: errorResponse,
			},
			"全局异常过滤器"
		);

		response.status(status).json(errorResponse);
	}
}
