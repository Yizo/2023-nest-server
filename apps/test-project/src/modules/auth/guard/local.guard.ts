import { ExecutionContext, Injectable, Logger } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

@Injectable()
export class LocalAuthGuard extends AuthGuard('local') {
  constructor(private readonly logger: Logger) {
    super();
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    this.logger.log('LocalAuthGuard:canActivate');
    // 可以检测是否启用账密登录
    return super.canActivate(context) as boolean;
  }
}
