import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { Logger } from '@nestjs/common';

export interface ApiResponse<T> {
  code: number;
  message: string;
  data: T;
  total?: number | null;
  page?: number | null;
  pageSize?: number | null;
  totalPages?: number | null;
}

@Injectable()
export class ResponseInterceptor<T = Record<string, any>>
  implements NestInterceptor<T, ApiResponse<T>>
{
  constructor(private readonly logger: Logger) {}

  intercept(
    context: ExecutionContext,
    next: CallHandler,
  ): Observable<ApiResponse<T>> {
    return next.handle().pipe(
      map((data) => {
        this.logger.log({ data }, '全局响应拦截器');

        // 针对字符串、数字、Buffer、Stream等非对象类型特殊处理
        if (typeof data === 'string' || typeof data === 'number') {
          return {
            code: 0,
            data,
            message: '成功',
          };
        }
        if (Buffer.isBuffer(data)) {
          return data;
        }
        // 处理流（如文件下载等）
        if (data && typeof data.pipe === 'function') {
          // 直接返回原始流，不包装
          return data;
        }

        const {
          msg = '',
          code = 0,
          message = '',
          total = null,
          page = null,
          pageSize = null,
          ...rest
        } = data || {};

        const newData = rest && typeof rest === 'object' ? rest : {};
        const result: ApiResponse<any> = {
          code,
          data: null,
          message: msg || message || '成功',
        };

        if (total != null) result.total = total;
        if (page != null) result.page = page;
        if (pageSize != null) result.pageSize = pageSize;

        if ('data' in newData) {
          const { data, ...other } = newData;
          result.data = data;
          Object.assign(result, other);
        } else {
          result.data = Object.keys(newData).length ? { ...newData } : null;
        }

        this.logger?.log(result, '全局响应拦截器:result');

        return result;
      }),
    );
  }
}
