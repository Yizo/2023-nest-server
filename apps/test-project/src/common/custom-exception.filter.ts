import {
  ExceptionFilter,
  ArgumentsHost,
  HttpStatus,
  HttpException,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import { Response, Request } from 'express';
import { QueryFailedError } from 'typeorm';

// 异常处理结果接口
interface ExceptionResult {
  status: number;
  message: string;
  stack: string;
  customCode?: number;
  details?: any;
}

// 工具函数：提取异常响应中的消息和自定义字段
function extractErrorInfo(
  errorResponse: any,
  defaultMessage: string,
): { message: string; customCode?: number; details?: any } {
  let message = defaultMessage;
  let customCode: number | undefined;
  let details: any = undefined;

  if (typeof errorResponse === 'string') {
    message = errorResponse;
  } else if (typeof errorResponse === 'object' && errorResponse !== null) {
    if ('message' in errorResponse) {
      const responseMessage = errorResponse.message;
      message = Array.isArray(responseMessage)
        ? responseMessage.join('; ')
        : responseMessage;
    }
    if ('code' in errorResponse) {
      customCode = errorResponse.code;
    }
    if ('details' in errorResponse) {
      details = errorResponse.details;
    }
  }

  return { message, customCode, details };
}

// 异常处理函数映射
const exceptionHandlers = {
  // QueryFailedError 处理
  QueryFailedError: (exception: QueryFailedError): ExceptionResult => {
    let message = exception.message;
    let stack = '';

    if (exception.driverError && (exception.driverError as any).errno) {
      switch ((exception.driverError as any).errno) {
        case 1062:
          message = '主键或唯一索引冲突';
          break;
        case 1451:
          message = '外键约束失败';
          break;
        default:
          message = (exception.driverError as any).sqlMessage || message;
      }
    }

    if (exception.driverError && (exception.driverError as any).stack) {
      stack = (exception.driverError as any).stack;
    } else {
      stack = exception.stack || '';
    }

    return { status: HttpStatus.BAD_REQUEST, message, stack };
  },

  // UnauthorizedException 处理
  UnauthorizedException: (
    exception: UnauthorizedException,
  ): ExceptionResult => {
    const status = exception.getStatus();
    const errorResponse = exception.getResponse();
    const { message, customCode, details } = extractErrorInfo(
      errorResponse,
      exception.message,
    );
    return { status, message, stack: exception.stack, customCode, details };
  },

  // 其他 HttpException 处理
  HttpException: (exception: HttpException): ExceptionResult => {
    const status = exception.getStatus();
    const errorResponse = exception.getResponse();
    const { message } = extractErrorInfo(errorResponse, exception.message);
    return { status, message, stack: exception.stack };
  },

  // 通用 Error 处理
  Error: (exception: Error): ExceptionResult => ({
    status: HttpStatus.INTERNAL_SERVER_ERROR,
    message: exception.message,
    stack: exception.stack,
  }),

  // 默认处理
  default: (exception: unknown): ExceptionResult => ({
    status: HttpStatus.INTERNAL_SERVER_ERROR,
    message: String(exception),
    stack: '',
  }),
};

export class CustomExceptionFilter implements ExceptionFilter {
  constructor(private readonly logger: Logger) {}

  // 过滤敏感信息的方法
  private sanitizeBody(body: any): any {
    if (!body || typeof body !== 'object') {
      return body;
    }

    const sensitiveFields = [
      'password',
      'passwd',
      'pwd',
      'token',
      'secret',
      'key',
      'authorization',
    ];
    const sanitized = { ...body };

    // 递归过滤敏感字段
    const filterObject = (obj: any) => {
      for (const key in obj) {
        if (
          sensitiveFields.some((field) => key.toLowerCase().includes(field))
        ) {
          obj[key] = '[FILTERED]';
        } else if (typeof obj[key] === 'object' && obj[key] !== null) {
          filterObject(obj[key]);
        }
      }
    };

    filterObject(sanitized);
    return sanitized;
  }

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    // 确定处理器
    let handler;
    if (exception instanceof QueryFailedError)
      handler = exceptionHandlers.QueryFailedError;
    else if (exception instanceof UnauthorizedException)
      handler = exceptionHandlers.UnauthorizedException;
    else if (exception instanceof HttpException)
      handler = exceptionHandlers.HttpException;
    else if (exception instanceof Error) handler = exceptionHandlers.Error;
    else handler = exceptionHandlers.default;

    // 处理异常
    const result = handler(exception);

    this.logger?.log(result, '全局过滤器:result');

    // 获取请求开始时间（如果存在）
    const startTime = (request as any).startTime || Date.now();
    const processingTime = Date.now() - startTime;

    // 生成请求ID用于追踪
    const requestId =
      (request as any).requestId ||
      `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    // 获取用户信息
    const userId =
      (request as any).user?.id || (request as any).user?.userId || null;
    const userAgent = request.headers['user-agent'] || '';
    const contentLength = request.headers['content-length'] || '0';

    // 获取环境信息
    const environment = process.env.NODE_ENV || 'development';

    // 记录详细错误日志到modules日志文件
    this.logger.error(
      {
        // 基础错误信息
        message: result.message,
        code: result.customCode || result.status,
        exception: exception['name'] ?? 'UnknownException',
        stack: result,
        details: result.details,

        // 请求信息
        requestId,
        method: request.method,
        url: request.url,
        path: request.url,
        originalUrl: request.originalUrl,
        protocol: request.protocol,
        hostname: request.hostname,
        subdomains: request.subdomains,
        query: request.query,
        params: request.params,

        // 客户端信息
        ip: request.ip,
        userAgent,
        contentLength,
        headers: request.headers,

        // 用户信息
        userId,

        // 性能信息
        processingTime: `${processingTime}ms`,
        timestamp: new Date().toISOString(),

        // 环境信息
        environment,
        nodeVersion: process.version,
        platform: process.platform,

        // 请求体（敏感信息过滤）
        body: this.sanitizeBody(request.body),
      },
      result.stack,
      '全局过滤器',
    );

    // 构建并发送响应
    const responseBody = {
      code: result.customCode || result.status,
      message: result.message,
      method: request.method,
      timestamp: new Date(Date.now() + 8 * 60 * 60 * 1000)
        .toISOString()
        .replace('T', ' ')
        .substring(0, 19),
      exception: exception['name'] ?? 'UnknownException',
      path: request.url,
      ...(result.details !== undefined && { details: result.details }),
    };

    response.status(HttpStatus.OK).json(responseBody);
  }
}
