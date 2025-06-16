import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  Inject,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import { Logger } from 'winston';

export interface ApiResponse<T> {
  code: number;
  msg: string;
  data: T;
}

@Injectable()
export class ResponseInterceptor<T = Record<string, any>>
  implements NestInterceptor<T, ApiResponse<T>>
{
  constructor(
    @Inject(WINSTON_MODULE_PROVIDER) private readonly logger: Logger,
  ) {}

  intercept(
    context: ExecutionContext,
    next: CallHandler,
  ): Observable<ApiResponse<T>> {
    return next.handle().pipe(
      map((data) => {
        const response = context.switchToHttp().getResponse();

        this.logger.info('全局响应拦截器', {
          data,
        });

        // 判断是否是我们定义的结构（包含 code 和 msg）
        if (data && typeof data === 'object' && 'code' in data) {
          const statusCode = data.code === 0 ? data.code : 0;
          response.status(statusCode);
          return data;
        }

        // 普通成功响应包装
        return {
          code: 0,
          msg: '成功',
          data,
        };
      }),
    );
  }
}
