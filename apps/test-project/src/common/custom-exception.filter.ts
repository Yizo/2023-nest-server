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

    // 记录日志
    // this.logger.error(
    //   {
    //     message: result.message,
    //     code: result.customCode || result.status,
    //     method: request.method,
    //     path: request.url,
    //     url: request.url,
    //     headers: request.headers,
    //     query: request.query,
    //     params: request.params,
    //     body: request.body,
    //     ip: request.ip,
    //     protocol: request.protocol,
    //     originalUrl: request.originalUrl,
    //     hostname: request.hostname,
    //     subdomains: request.subdomains,
    //     exception: exception['name'] ?? 'UnknownException',
    //     details: result.details,
    //   },
    //   result.stack,
    //   '全局过滤器',
    // );

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
