import { Injectable, NestMiddleware, Inject } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import { Logger } from 'winston';

@Injectable()
export class LoggerMiddleware implements NestMiddleware {
  constructor(
    @Inject(WINSTON_MODULE_PROVIDER) private readonly logger: Logger,
  ) {}

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

    this.logger.info('全局中间件-HTTP请求信息', { requestInfo });

    next();
  }
}
