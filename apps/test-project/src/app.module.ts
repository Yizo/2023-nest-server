import {
  Module,
  DynamicModule,
  NestModule,
  RequestMethod,
  Logger,
  Global,
} from '@nestjs/common';
import type { MiddlewareConsumer } from '@nestjs/common';
import { APP_INTERCEPTOR } from '@nestjs/core';
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
    }) as DynamicModule,
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: Record<string, any>) => ({
        type: config.get(`db.${DbConfigKey.TYPE}`),
        autoLoadEntities: config.get(`db.${DbConfigKey.AUTO_LOAD_ENTITIES}`),
        migrationsRun: config.get(`db.${DbConfigKey.MIGRATIONS_RUN}`),
        host: config.get(`db.${DbConfigKey.HOST}`),
        port: config.get(`db.${DbConfigKey.PORT}`),
        username: config.get(`db.${DbConfigKey.USERNAME}`),
        password: config.get(`db.${DbConfigKey.PASSWORD}`),
        database: config.get(`db.${DbConfigKey.DATABASE}`),
        timezone: config.get(`db.${DbConfigKey.TIMEZONE}`),
        synchronize: config.get(`db.${DbConfigKey.SYNCHRONIZE}`),
        logging: config.get(`db.${DbConfigKey.LOGGING}`),
        logger: config.get(`db.${DbConfigKey.LOGGER}`),
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
    Logger,
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
