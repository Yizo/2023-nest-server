import {
  Injectable,
  Inject,
  OnModuleInit,
  Logger as NestLogger,
} from '@nestjs/common';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import { Logger } from 'winston';

@Injectable()
export class LoggerService implements OnModuleInit {
  private static loggerInstance: Logger;

  constructor(
    @Inject(WINSTON_MODULE_PROVIDER) private readonly logger: Logger,
  ) {}

  onModuleInit() {
    LoggerService.loggerInstance = this.logger;
  }

  // 使用 Proxy 代理所有的日志方法访问
  static get instance(): Logger {
    if (!LoggerService.loggerInstance) {
      NestLogger.warn(
        'Logger not initialized yet, using NestLogger as fallback',
      );
      return;
    }

    // 使用 Proxy 代理所有访问到 Winston Logger
    return new Proxy(LoggerService.loggerInstance, {
      get: (target, prop) => {
        if (prop in target) {
          const method = target[prop as keyof Logger];
          if (typeof method === 'function') {
            return method.bind(target);
          }
          return method;
        }
      },
    });
  }
}
