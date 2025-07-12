import {
  ExceptionFilter,
  ArgumentsHost,
  HttpStatus,
  HttpException,
  Logger,
} from '@nestjs/common';
import { Response, Request } from 'express';
import { QueryFailedError } from 'typeorm';

export class CustomExceptionFilter implements ExceptionFilter {
  constructor(private readonly logger: Logger) {}
  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let message = 'Internal server error';
    let stack = '';

    if (exception instanceof QueryFailedError) {
      status = HttpStatus.BAD_REQUEST;
      message = exception.message;
      if (exception.driverError && exception.driverError.errno) {
        switch (exception.driverError.errno) {
          case 1062: // Duplicate entry
            message = '主键或唯一索引冲突';
            break;
          case 1451: // Foreign key constraint fails
            message = '外键约束失败';
            break;
          default:
            message = exception.driverError.sqlMessage || message;
        }
      }
      if (exception.driverError && exception.driverError.stack) {
        stack = exception.driverError.stack;
      } else {
        stack = exception.stack || '';
      }
    } else if (exception instanceof HttpException) {
      status = exception.getStatus();
      const errorResponse = exception.getResponse();
      if (typeof errorResponse === 'string') {
        message = errorResponse;
      } else if (
        typeof errorResponse === 'object' &&
        'message' in errorResponse
      ) {
        message = Array.isArray((errorResponse as any).message)
          ? (errorResponse as any).message.join('; ')
          : (errorResponse as any).message;
      } else {
        message = exception.message;
      }
      stack = exception.stack;
    } else if (exception instanceof Error) {
      message = exception.message;
      stack = exception.stack;
    } else {
      message = String(exception);
    }

    this.logger.error(
      {
        message,
        code: status,
        method: request.method,
        path: request.url,
        url: request.url,
        headers: request.headers,
        query: request.query,
        params: request.params,
        body: request.body,
        ip: request.ip,
        protocol: request.protocol,
        originalUrl: request.originalUrl,
        hostname: request.hostname,
        subdomains: request.subdomains,
        exception: exception['name'] ?? 'UnknownException',
      },
      stack,
      '全局过滤器',
    );

    response.status(status).json({
      code: status,
      message,
      method: request.method,
      timestamp: new Date(Date.now() + 8 * 60 * 60 * 1000)
        .toISOString()
        .replace('T', ' ')
        .substring(0, 19),
      exception: exception['name'] ?? 'UnknownException',
      path: request.url,
    });
  }
}
