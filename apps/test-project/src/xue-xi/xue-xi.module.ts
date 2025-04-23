import { Module } from '@nestjs/common';
import { XueXiService } from './xue-xi.service';
import { XueXiController } from './xue-xi.controller';

@Module({
  controllers: [XueXiController],
  providers: [XueXiService],
  exports: [XueXiService],
})
export class XueXiModule {}
