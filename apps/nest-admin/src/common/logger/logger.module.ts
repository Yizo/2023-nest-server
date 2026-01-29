import { Module, Global, DynamicModule } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { WinstonModule, utilities } from 'nest-winston';
import * as winston from 'winston';
import { Logform } from 'winston';
import * as DailyRotateFile from 'winston-daily-rotate-file';
import { join } from 'path';
import { LoggerConfigKey } from '@/enums';

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

            // 自定义时间戳格式器（北京时间）
            const beijingTimeFormat = winston.format(
              (info: Logform.TransformableInfo) => {
                const date = info.timestamp
                  ? new Date(info.timestamp as string)
                  : new Date();
                const beijingTime = date.toLocaleString('zh-CN', {
                  timeZone: 'Asia/Shanghai', // 北京时间
                  year: 'numeric',
                  month: '2-digit',
                  day: '2-digit',
                  hour: '2-digit',
                  minute: '2-digit',
                  second: '2-digit',
                  hour12: false,
                });
                info.timestamp = beijingTime;
                return info;
              },
            );

            // 控制台日志
            const consoleFormat = winston.format.combine(
              // winston.format.colorize(),
              winston.format.timestamp(),
              utilities.format.nestLike(),
              winston.format.align(),
              winston.format.ms(),
            );

            const fileFormat = winston.format.combine(
              beijingTimeFormat(),
              winston.format.json(),
            );

            const maxSize = configService.get<string>(
              LoggerConfigKey.MAX_SIZE,
              '20m',
            );
            const maxFiles = configService.get<string>(
              LoggerConfigKey.MAX_FILES,
              '14d',
            );

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
