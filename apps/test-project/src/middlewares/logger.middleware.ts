import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';

@Injectable()
export class LoggerMiddleware implements NestMiddleware {
  use(req: Request, res: Response, next: NextFunction) {
    console.log(
      '-----------------------------------全局中间件-----------------------------------',
    );
    console.log(`Request method: ${req.method}`);
    console.log(`Request URL: ${req.url}`);
    console.log(`Request path: ${req.path}`);

    console.log(`Request headers:`, req.headers);
    console.log(`Request query:`, req.query); // URL 查询参数
    console.log(`Request params:`, req.params); // 路由参数（如 /user/:id）
    console.log(`Request body:`, req.body); // POST 请求体（如果已解析）

    console.log(`Request IP: ${req.ip}`); // 客户端 IP
    console.log(`Request protocol: ${req.protocol}`); // HTTP 协议（http/https）
    console.log(`Request original URL: ${req.originalUrl}`); // 完整带 query 的 URL路径
    console.log(`Request hostname: ${req.hostname}`); // Host头部解析出的主机名
    console.log(`Request subdomains:`, req.subdomains); // 子域名（如 ['a', 'b'] 对应 a.b.example.com）
    console.log(
      '-----------------------------------全局中间件-----------------------------------',
    );
    next();
  }
}
