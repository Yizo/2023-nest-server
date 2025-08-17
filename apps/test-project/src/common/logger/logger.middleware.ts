import { Injectable, NestMiddleware, Logger } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';

@Injectable()
export class LoggerMiddleware implements NestMiddleware {
  constructor(private readonly logger: Logger) {}

  use(req: Request, res: Response, next: NextFunction) {
    const requestInfo = {
      method: req.method,
      url: req.url,
      path: req.path,
      headers: req.headers,
      query: req.query,
      params: req.params,
      body: req.body,
      ip: req.ip,
      protocol: req.protocol,
      originalUrl: req.originalUrl,
      hostname: req.hostname,
      subdomains: req.subdomains,
    };

    // this.logger.log({ requestInfo }, '全局中间件-HTTP请求信息');

    next();
  }
}
