import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { CreateXueXiDto } from './dto/create-xue-xi.dto';
import { UpdateXueXiDto } from './dto/update-xue-xi.dto';

@Injectable()
export class XueXiService {
  constructor(private config: ConfigService) {}

  create(createXueXiDto: CreateXueXiDto) {
    console.log(process.env.NODE_ENV, this.config.get('db'));
    return {
      code: 0,
      data: 'This action adds a new xueXi',
    };
  }

  findAll() {
    return `This action returns all xueXi`;
  }

  findOne(id: number) {
    return `This action returns a #${id} xueXi`;
  }

  update(id: number, updateXueXiDto: UpdateXueXiDto) {
    return `This action updates a #${id} xueXi`;
  }

  remove(id: number) {
    return `This action removes a #${id} xueXi`;
  }
}
