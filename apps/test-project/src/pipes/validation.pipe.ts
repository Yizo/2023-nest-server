import { PipeTransform, Injectable, ArgumentMetadata } from '@nestjs/common';
import { ValidationPipe } from '@nestjs/common';

@Injectable()
export class CustomValidationPipe
  extends ValidationPipe
  implements PipeTransform
{
  constructor() {
    super();
  }

  transform(value: any, metadata: ArgumentMetadata) {
    // 使用 console.log 替代 logger
    console.log('[CustomValidationPipe]', 'transform called:', {
      value,
      metadata,
    });
    return value;
  }
}
