import { Injectable, NestMiddleware, Logger } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';

@Injectable()
export class LoggerMiddleware implements NestMiddleware {
  constructor(private readonly logger: Logger) {}

  use(req: Request, res: Response, next: NextFunction) {
    // 为请求添加开始时间和唯一ID，用于性能监控和错误追踪
    (req as any).startTime = Date.now();
    (req as any).requestId = `req_${Date.now()}_${Math.random()
      .toString(36)
      .substr(2, 9)}`;

    // 添加请求ID到响应头，便于客户端追踪
    res.setHeader('X-Request-ID', (req as any).requestId);

    // 记录请求开始信息（可选）
    // const requestInfo = {
    //   requestId: (req as any).requestId,
    //   method: req.method,
    //   url: req.url,
    //   path: req.path,
    //   headers: req.headers,
    //   query: req.query,
    //   params: req.params,
    //   body: req.body,
    //   ip: req.ip,
    //   protocol: req.protocol,
    //   originalUrl: req.originalUrl,
    //   hostname: req.hostname,
    //   subdomains: req.subdomains,
    //   userAgent: req.headers['user-agent'],
    //   startTime: new Date((req as any).startTime).toISOString(),
    // };
    // this.logger.log({ requestInfo }, '全局中间件-HTTP请求信息');

    next();
  }
}
