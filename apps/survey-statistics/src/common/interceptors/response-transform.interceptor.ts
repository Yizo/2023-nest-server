import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from "@nestjs/common";
import type { Observable } from "rxjs";
import { map } from "rxjs/operators";

const metaKeys = ["total", "page", "pageSize"];

@Injectable()
export class ResponseTransformInterceptor implements NestInterceptor {
	intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
		return next.handle().pipe(map((result) => this.formatResponse(result)));
	}

	private formatResponse(payload: unknown) {
		const { data, meta } = this.extractPayload(payload);
		return {
			code: 0,
			message: "success",
			data,
			...(meta ?? {}),
		};
	}

	private extractPayload(payload: unknown): {
		data: unknown;
		meta: Record<string, unknown> | null;
	} {
		if (payload && Array.isArray(payload)) {
			return {
				data: payload,
				meta: null,
			};
		}

		if (payload && typeof payload === "object") {
			const clone = { ...payload } as Record<string, unknown>;
			const meta: Record<string, unknown> = {};
			for (const key of metaKeys) {
				if (key in clone) {
					meta[key] = clone[key];
					delete clone[key];
				}
			}

			const extractedData = "data" in clone ? clone.data : clone;
			if ("data" in clone) {
				delete clone.data;
			}

			return {
				data: extractedData ?? null,
				meta: Object.keys(meta).length ? meta : null,
			};
		}

		return {
			data: payload ?? null,
			meta: null,
		};
	}
}
