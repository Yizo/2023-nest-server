import type { Request } from "express";

/** 统一成功和失败响应中的公共字段。 */
export interface ApiResponse<T> {
	code: number;
	message: string;
	data: T | null;
	requestId: string;
	timestamp: string;
}

/** Request ID 中间件附加到 Express 请求对象上的字段。 */
export type RequestWithId = Request & { requestId?: string };
