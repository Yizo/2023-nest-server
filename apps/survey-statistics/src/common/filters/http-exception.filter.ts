import { ArgumentsHost, Catch, ExceptionFilter, HttpException, HttpStatus } from "@nestjs/common";
import type { Request, Response } from "express";

interface HttpErrorBody {
	message?: string | string[];
	error?: string;
}

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
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
			}
		} else if (exception instanceof Error && exception.message) {
			message = exception.message;
		}

		response.status(status).json({
			code: status,
			message,
			data: null,
			timestamp: new Date().toISOString(),
			path: request.url,
		});
	}
}
