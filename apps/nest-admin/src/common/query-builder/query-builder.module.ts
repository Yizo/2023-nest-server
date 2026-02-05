import { Module, Global } from '@nestjs/common';
import { QueryBuilderFactory } from './query-builder.factory';

@Global() // 使其成为全局模块，所有模块都可以使用
@Module({
  providers: [QueryBuilderFactory],
  exports: [QueryBuilderFactory],
})
export class QueryBuilderModule {}
