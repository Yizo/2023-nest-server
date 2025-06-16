import { Injectable, NestMiddleware, Inject } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { LoggerService } from '@/common';

@Injectable()
export class LoggerMiddleware implements NestMiddleware {
  constructor() {}

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

    LoggerService.instance.info('全局中间件-HTTP请求信息', { requestInfo });

    next();
  }
}
