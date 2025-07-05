import {
  IsString,
  IsInt,
  IsEnum,
  validate,
  Min,
  IsOptional,
} from 'class-validator';
import { plainToInstance } from 'class-transformer';
import { SortOrder } from '@/enums';
import {
  ArgumentMetadata,
  PipeTransform,
  Injectable,
  HttpException,
  HttpStatus,
} from '@nestjs/common';

export class FindAllBodyDto {
  @IsInt()
  @Min(1)
  @IsOptional()
  page: number;
  @IsInt()
  @IsOptional()
  pageSize: number;
  @IsEnum(SortOrder)
  @IsOptional()
  sort: SortOrder;
  @IsString()
  @IsOptional()
  gender: string;
  @IsInt()
  @IsOptional()
  role: number;
}

@Injectable()
export class FindAllBodyDtoPipe implements PipeTransform {
  async transform(value: any, metadata: ArgumentMetadata) {
    if (!metadata.metatype) {
      return value;
    }
    console.log('FindAllBodyDtoPipe transform', value, metadata);
    const dto = plainToInstance(metadata.metatype, value);
    const errors = await validate(dto);
    if (errors.length > 0) {
      // 只返回第一个字段的第一个 message
      const constraints = errors[0].constraints;
      const errorMessage = constraints
        ? Object.values(constraints)[0]
        : '参数校验失败';
      console.log('FindAllBodyDtoPipe errorMessage', errorMessage);
      throw new HttpException(errorMessage, HttpStatus.BAD_REQUEST);
    }
    return value;
  }
}
