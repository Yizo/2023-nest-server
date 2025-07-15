import {
  PipeTransform,
  Injectable,
  ArgumentMetadata,
  HttpStatus,
  HttpException,
  Logger,
  ValidationPipe,
} from '@nestjs/common';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';

@Injectable()
export class CustomValidationPipe
  extends ValidationPipe
  implements PipeTransform
{
  constructor(private readonly logger?: Logger) {
    super();
  }

  async transform(value: unknown, metadata: ArgumentMetadata) {
    if (!metadata.metatype) {
      return value;
    }
    this.logger?.log({ value, metadata }, '验证管道');
    // 将普通的 JavaScript 参数对象转换为类型化对象，以便进行验证
    const dto = plainToInstance(metadata.metatype, value);
    const errors = await validate(dto);
    if (errors.length > 0) {
      // 只返回第一个字段的第一个 message
      const constraints = errors[0].constraints;
      const errorMessage = constraints
        ? Object.values(constraints)[0]
        : '参数校验失败';
      this.logger?.error({ errorMessage }, '参数校验失败');
      throw new HttpException(errorMessage, HttpStatus.BAD_REQUEST);
    }
    return dto; // 返回转换后的 DTO 对象
  }
}
