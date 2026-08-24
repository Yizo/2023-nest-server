import { RequestContext } from "@mikro-orm/core";
import { Injectable, type NestMiddleware } from "@nestjs/common";
import { MikroORM } from "@mikro-orm/postgresql";
import type { NextFunction, Request, Response } from "express";

/**
 * 为每个 HTTP 请求创建独立的 MikroORM EntityManager 上下文。
 *
 * MikroORM 的全局 EntityManager 不能直接承载多个并发请求；RequestContext
 * 通过 AsyncLocalStorage 让后续 Service 获取到当前请求自己的 EntityManager。
 */
@Injectable()
export class MikroOrmRequestContextMiddleware implements NestMiddleware {
	constructor(private readonly orm: MikroORM) {}

	use(_request: Request, _response: Response, next: NextFunction): void {
		// RequestContext 的公开类型使用通用 driver，而运行时接受任意 driver 的
		// EntityManager；把兼容转换限制在这一处，不向业务代码传播宽泛类型。
		const entityManager = this.orm.em as unknown as Parameters<typeof RequestContext.create>[0];
		RequestContext.create(entityManager, next);
	}
}
