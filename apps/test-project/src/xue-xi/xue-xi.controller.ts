import { Controller, Post, Body, HttpCode, HttpStatus } from '@nestjs/common';

import { XueXiService } from './xue-xi.service';
import { CreateXueXiDto } from './dto/create-xue-xi.dto';

@Controller('demo')
export class XueXiController {
  constructor(private readonly xueXiService: XueXiService) {}

  @Post('add')
  @HttpCode(200)
  handleAdd(@Body() data: CreateXueXiDto) {
    return this.xueXiService.create(data);
  }

  @Post('create')
  @HttpCode(HttpStatus.OK)
  async handleCreate() {
    const data = {
      title: '测试',
      content: '测试内容',
    };
    return data;
  }
}
