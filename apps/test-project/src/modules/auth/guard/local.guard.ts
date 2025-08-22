import {
  BadRequestException,
  ExecutionContext,
  Injectable,
  Logger,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { plainToClass } from 'class-transformer';
import { validate } from 'class-validator';
import { LoginDto } from '../dto/create-auth.dto';

@Injectable()
export class LocalAuthGuard extends AuthGuard('local') {
  constructor(private readonly logger: Logger) {
    super();
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();

    const dto = plainToClass(LoginDto, request.body);
    const errors = await validate(dto);

    if (errors.length > 0) {
      console.log('errors', errors);
      const constraints = errors[0].constraints;
      const errorMessage = constraints
        ? Object.values(constraints)[0]
        : '参数校验失败';
      throw new BadRequestException(errorMessage);
    }

    return super.canActivate(context) as boolean;
  }
}
