import { PipeTransform, Injectable, ArgumentMetadata } from '@nestjs/common';
import { ValidationPipe } from '@nestjs/common';

@Injectable()
export class CustomValidationPipe
  extends ValidationPipe
  implements PipeTransform
{
  transform(value: any, metadata: ArgumentMetadata) {
    console.log('CustomValidationPipe transform called', value, metadata);
    return value;
  }
}
