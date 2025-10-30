import {
  PipeTransform,
  Injectable,
  ArgumentMetadata,
  HttpStatus,
  HttpException,
  Logger,
  ValidationPipe,
} from '@nestjs/common';

@Injectable()
export class CustomValidationPipe
  extends ValidationPipe
  implements PipeTransform
{
  constructor(private readonly logger?: Logger) {
    super({
      // 自动剔除 DTO 中未定义的属性
      whitelist: true,
      // 遇到未声明字段不报错，只过滤掉
      forbidNonWhitelisted: false,
      // 自动类型转换（如字符串转数字、布尔等，推荐）
      transform: true,
      exceptionFactory: (errors) => {
        const firstError = errors.find(
          (error) => Object.keys(error.constraints).length > 0,
        );

        const message = firstError
          ? Object.values(firstError.constraints)[0]
          : '参数校验失败';

        return new HttpException({ message }, HttpStatus.BAD_REQUEST);
      },
    });
  }

  async transform(value: unknown, metadata: ArgumentMetadata) {
    this.logger?.log({ value, metadata }, '验证管道');

    return super.transform(value, metadata);
  }
}
