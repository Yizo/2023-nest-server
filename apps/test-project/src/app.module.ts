import {
  Module,
  ValidationPipe,
  NestModule,
  RequestMethod,
  Logger,
  Global,
} from '@nestjs/common';
import type { MiddlewareConsumer } from '@nestjs/common';
import { APP_INTERCEPTOR, APP_PIPE, APP_FILTER } from '@nestjs/core';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { CustomExceptionFilter } from '@/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { LoggerModule } from '@/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import configuration from '../config/configuration';
import { TypeOrmModule } from '@nestjs/typeorm';
import { XueXiModule } from '@/modules/xue-xi/xue-xi.module';
import { UserModule } from '@/modules/user/user.module';
import { LoggerMiddleware, ResponseInterceptor } from '@/common';
import { DbConfigKey } from '@/enums';
import { ProfileModule } from './modules/profile/profile.module';
import { AuthModule } from './modules/auth/auth.module';

@Global()
@Module({
  imports: [
    // 配置全局 Winston 日志系统
    LoggerModule.forRoot(),
    ConfigModule.forRoot({
      isGlobal: true,
      load: [configuration],
    }),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: Record<string, any>) => ({
        type: config.get(DbConfigKey.TYPE),
        autoLoadEntities: config.get(DbConfigKey.AUTO_LOAD_ENTITIES),
        migrationsRun: config.get(DbConfigKey.MIGRATIONS_RUN),
        host: config.get(DbConfigKey.HOST),
        port: config.get(DbConfigKey.PORT),
        username: config.get(DbConfigKey.USERNAME),
        password: config.get(DbConfigKey.PASSWORD),
        database: config.get(DbConfigKey.DATABASE),
        timezone: config.get(DbConfigKey.TIMEZONE),
        synchronize: config.get(DbConfigKey.SYNCHRONIZE),
        logging: config.get(DbConfigKey.LOGGING),
        logger: config.get(DbConfigKey.LOGGER),
        entities: [__dirname + '/**/*.entity{.ts,.js}'],
      }),
    }),
    XueXiModule,
    UserModule,
    ProfileModule,
    AuthModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    {
      provide: APP_INTERCEPTOR,
      useClass: ResponseInterceptor,
    },
    {
      provide: APP_PIPE,
      useFactory: () =>
        new ValidationPipe({
          // 自动剔除 DTO 中未定义的属性
          whitelist: true,
          // 遇到未声明字段直接报错
          forbidNonWhitelisted: true,
          // 自动类型转换（如字符串转数字、布尔等，推荐）
          transform: true,
        }),
    },
    {
      // 这里只起到一个别名的作用
      provide: Logger,
      // 指定要复用的类, 实际上是将 nest-winston 日志注入到 NestJS Logger
      useExisting: WINSTON_MODULE_NEST_PROVIDER,
    },
    // 全局异常过滤器
    {
      provide: APP_FILTER,
      useFactory: (logger: Logger) => new CustomExceptionFilter(logger),
      inject: [WINSTON_MODULE_NEST_PROVIDER],
    },
  ],
  exports: [Logger],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(LoggerMiddleware).forRoutes({
      path: '*',
      method: RequestMethod.ALL,
    });
  }
}
