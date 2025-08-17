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
    super({
      // 自动剔除 DTO 中未定义的属性
      whitelist: true,
      // 遇到未声明字段直接报错
      forbidNonWhitelisted: true,
      // 自动类型转换（如字符串转数字、布尔等，推荐）
      transform: true,
    });
  }

  async transform(value: unknown, metadata: ArgumentMetadata) {
    this.logger?.log({ value, metadata }, '验证管道');

    // 首先调用父类的transform方法，应用whitelist等配置
    const transformedValue = await super.transform(value, metadata);

    // 跳过路径参数和无效类型
    if (metadata.type === 'param' || typeof metadata.metatype !== 'function') {
      return transformedValue;
    }

    // 确保 metatype 是有效的类构造函数
    if (!metadata.metatype || !metadata.metatype.prototype.constructor) {
      return transformedValue;
    }

    try {
      // 将普通的 JavaScript 参数对象转换为类型化对象，以便进行验证
      const dto = plainToInstance(metadata.metatype, transformedValue);
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
    } catch (error) {
      this.logger?.error({ error: error.message }, 'DTO转换失败');
      return transformedValue;
    }
  }
}
