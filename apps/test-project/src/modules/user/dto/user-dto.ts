import {
  IsString,
  IsInt,
  IsEnum,
  validate,
  Min,
  IsOptional,
  ValidateNested,
} from 'class-validator';
import { plainToInstance, Type } from 'class-transformer';
import { SortOrder } from '@/enums';
import {
  ArgumentMetadata,
  PipeTransform,
  Injectable,
  HttpException,
  HttpStatus,
} from '@nestjs/common';

export class FindAllBodyDto {
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @IsOptional()
  page: number;

  @Type(() => Number)
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

class UpdateProfileDto {
  @IsOptional()
  @IsString()
  gender: string;

  @IsOptional()
  @IsString()
  photo: string;

  @IsOptional()
  @IsString()
  address: string;
}

export class UpdateUserDto {
  @IsString()
  @IsOptional()
  username: string;

  @IsString()
  @IsOptional()
  password: string;

  @IsOptional()
  @ValidateNested()
  @Type(() => UpdateProfileDto)
  profile: UpdateProfileDto;
}

@Injectable()
export class DtoPipe implements PipeTransform {
  async transform(value: unknown, metadata: ArgumentMetadata) {
    if (!metadata.metatype) {
      return value;
    }
    console.log('DtoPipe transform', value, metadata);
    const dto = plainToInstance(metadata.metatype, value);
    const errors = await validate(dto);
    if (errors.length > 0) {
      // 只返回第一个字段的第一个 message
      const constraints = errors[0].constraints;
      const errorMessage = constraints
        ? Object.values(constraints)[0]
        : '参数校验失败';
      console.log('DtoPipe errorMessage', errorMessage);
      throw new HttpException(errorMessage, HttpStatus.BAD_REQUEST);
    }
    return value;
  }
}
