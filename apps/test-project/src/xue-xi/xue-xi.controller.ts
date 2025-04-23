import {
  Controller,
  Get,
  Post,
  Body,
  Req,
  Query,
  Headers,
  Ip,
  HostParam,
  HttpCode
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  NextFunction,
  Request as ExpressRequest,
  Response as ExpressResponse,
} from 'express';
import { XueXiService } from './xue-xi.service';
import { CreateXueXiDto } from './dto/create-xue-xi.dto';
import { UpdateXueXiDto } from './dto/update-xue-xi.dto';

@Controller('demo')
export class XueXiController {
  constructor(private readonly xueXiService: XueXiService) {}

  @Get()
  getRequest(
    @Query() query: Record<string, string>,
    @Req() req: ExpressRequest,
    @Ip() ip: string,
    @HostParam() host: string,
    @Headers() headers: Record<string, string>,
  ) {
    const ipStr = req.headers['x-forwarded-for'] || req.ip || ip;
    const reqKeys = [];
    Reflect.ownKeys(req).forEach((key) => {
      if (key && typeof key === 'string' && !key.startsWith('_')) {
        reqKeys.push(key);
      }
    });
    return {
      query,
      hostname: req.hostname, // 完整主机名 (example.com:3000)
      protocol: req.protocol, // 协议 (http/https)
      baseUrl: req.baseUrl,
      ip: ipStr,
      host,
      reqKeys,
      headers,
    };
  }


  @Post('add')
  @HttpCode(200)
  handleAdd(@Body() data: CreateXueXiDto){
    return this.xueXiService.create(data)
  }
}
