import { Injectable } from '@nestjs/common';
import { Repository, ObjectLiteral } from 'typeorm';
import { QueryBuilderHelper } from './query-builder.interface';
import { QueryBuilderHelperImpl } from './query-builder.helper';

@Injectable()
export class QueryBuilderFactory {
  /**
   * 通过Repository创建查询构建器实例
   */
  createFromRepository<T extends ObjectLiteral>(
    repository: Repository<T>,
  ): QueryBuilderHelper<T> {
    return new QueryBuilderHelperImpl<T>(repository);
  }
}
