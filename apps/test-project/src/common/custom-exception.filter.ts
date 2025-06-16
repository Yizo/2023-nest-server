import {
  ExceptionFilter,
  ArgumentsHost,
  HttpStatus,
  HttpException,
  Inject,
} from '@nestjs/common';
import { Response, Request } from 'express';
import { Logger } from 'winston';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';

export class CustomExceptionFilter implements ExceptionFilter {
  constructor(@Inject(WINSTON_MODULE_PROVIDER) private logger: Logger) {}
  catch(exception: HttpException, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let message = 'Internal server error';

    status = exception.getStatus();
    const errorResponse = exception.getResponse();

    if (typeof errorResponse === 'string') {
      message = errorResponse;
    } else if (
      typeof errorResponse === 'object' &&
      'message' in errorResponse
    ) {
      message = (errorResponse as any).message;
    } else if (exception instanceof Error) {
      message = exception.message;
    }
    this.logger.error('全局过滤器捕获到错误', {
      message,
      stack: exception.stack,
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
    });

    response.status(status).json({
      code: status,
      message,
      method: request.method,
      timestamp: new Date().toISOString(),
      path: request.url,
    });
  }
}
