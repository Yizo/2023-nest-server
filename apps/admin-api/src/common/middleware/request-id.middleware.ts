import { randomUUID } from "node:crypto";
import type { NextFunction, Request, Response } from "express";
import type { NestMiddleware } from "@nestjs/common";
import type { RequestWithId } from "../types";

const REQUEST_ID_HEADER = "x-request-id";

/**
 * 为每个 HTTP 请求生成可追踪的 Request ID。
 *
 * 外部系统传入的 ID 只在长度和字符集满足限制时复用，避免日志注入；
 * 不合法或缺失时生成新的 UUID，并把最终值写回响应头。
 */
export class RequestIdMiddleware implements NestMiddleware {
	use(request: Request, response: Response, next: NextFunction): void {
		const incoming = request.header(REQUEST_ID_HEADER)?.trim();
		const requestId = incoming && /^[A-Za-z0-9._-]{1,100}$/.test(incoming) ? incoming : randomUUID();

		(response as Response).setHeader(REQUEST_ID_HEADER, requestId);
		(request as RequestWithId).requestId = requestId;
		next();
	}
}
