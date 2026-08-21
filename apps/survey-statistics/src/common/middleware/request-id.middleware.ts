import { Injectable, NestMiddleware } from "@nestjs/common";
import type { NextFunction, Request, Response } from "express";
import { newId } from "../utils/ids";

@Injectable()
export class RequestIdMiddleware implements NestMiddleware {
  use(request: Request & { requestId?: string }, response: Response, next: NextFunction): void {
    // 优先沿用网关传入的 request id，否则生成一个可跨日志系统关联的 UUID。
    const incoming = request.header("x-request-id");
    request.requestId = incoming && incoming.length <= 100 ? incoming : newId();
    response.setHeader("x-request-id", request.requestId);
    next();
  }
}
