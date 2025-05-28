import { Module, Global, DynamicModule } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { WinstonModule } from 'nest-winston';
import * as winston from 'winston';
import * as DailyRotateFile from 'winston-daily-rotate-file';
import { join } from 'path';

@Global()
@Module({})
export class LoggerModule {
  static forRoot(): DynamicModule {
    return {
      module: LoggerModule,
      imports: [
        WinstonModule.forRootAsync({
          inject: [ConfigService],
          useFactory: (configService: ConfigService) => {
            const logDir = join(process.cwd(), 'logs');
            // 控制台日志
            const consoleFormat = winston.format.combine(
              winston.format.colorize({ all: true }),
              winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
              winston.format.align(),
              winston.format.printf(
                ({ timestamp, level, message, ...args }) => {
                  return `${timestamp} [${level}]: ${message} ${
                    Object.keys(args).length
                      ? JSON.stringify(args, null, 2)
                      : ''
                  }`;
                },
              ),
            );

            const fileFormat = winston.format.combine(
              winston.format.timestamp(),
              winston.format.json(),
            );

            const maxSize = configService.get<string>('maxSize');
            const maxFiles = configService.get<string>('maxFiles');

            return {
              transports: [
                new winston.transports.Console({ format: consoleFormat }),
                new DailyRotateFile({
                  level: 'warn',
                  filename: 'application-%DATE%.log',
                  dirname: join(logDir, 'warn'),
                  datePattern: 'YYYY-MM-DD',
                  zippedArchive: true,
                  maxSize,
                  maxFiles,
                  format: fileFormat,
                }),
                new DailyRotateFile({
                  level: 'info',
                  filename: 'application-%DATE%.log',
                  dirname: join(logDir, 'info'),
                  datePattern: 'YYYY-MM-DD',
                  zippedArchive: true,
                  maxSize,
                  maxFiles,
                  format: fileFormat,
                }),
                new DailyRotateFile({
                  level: 'error',
                  filename: 'application-%DATE%.log',
                  dirname: join(logDir, 'error'),
                  datePattern: 'YYYY-MM-DD',
                  zippedArchive: true,
                  maxSize,
                  maxFiles,
                  format: fileFormat,
                }),
              ],
              exceptionHandlers: [
                new DailyRotateFile({
                  filename: 'exceptions-%DATE%.log',
                  dirname: join(logDir, 'exceptions'),
                  datePattern: 'YYYY-MM-DD',
                  zippedArchive: true,
                  maxSize,
                  maxFiles,
                  format: fileFormat,
                }),
              ],
              handleExceptions: true,
              handleRejections: true,
            };
          },
        }),
      ],
    };
  }
}
