import {
	CallHandler,
	ExecutionContext,
	Injectable,
	NestInterceptor,
	StreamableFile,
	Logger,
} from "@nestjs/common";
import { Readable } from "stream";

import type { Observable } from "rxjs";
import { map } from "rxjs/operators";

export interface ApiResponse<T> {
	code: number;
	message: string;
	data: T;
	total?: number | null;
	page?: number | null;
	pageSize?: number | null;
	totalPages?: number | null;
}

@Injectable()
export class ResponseTransformInterceptor implements NestInterceptor {
	constructor(private readonly logger: Logger) {}
	intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
		return next.handle().pipe(
			map((result) => {
				this.logger.log({ result }, "全局响应拦截器:result");

				const response: ApiResponse<any> = {
					code: 0,
					message: "成功",
					data: null,
				};
				if (result == null) return response;
				if (Buffer.isBuffer(result)) return result;
				if (result instanceof StreamableFile) return result;
				if (result instanceof Readable) return new StreamableFile(result);

				if (typeof result !== "object") {
					response.data = result;
					return response;
				}

				const { total, page, pageSize, totalPages, code, message, ...rest } = result;
				response.code = code ?? 0;
				response.message = message ?? "成功";
				response.data = rest && Object.keys(rest).length > 0 ? rest : null;
				if (total != null) response.total = total;
				if (page != null) response.page = page;
				if (pageSize != null) response.pageSize = pageSize;
				if (totalPages != null) {
					response.totalPages = totalPages;
				} else if (total != null && pageSize != null && pageSize > 0) {
					response.totalPages = Math.ceil(total / pageSize);
				}
				this.logger.log({ response }, "全局响应拦截器:response");
				return response;
			})
		);
	}
}
