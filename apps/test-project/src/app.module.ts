import { Module, DynamicModule, NestModule, type MiddlewareConsumer, RequestMethod, Logger, Global } from '@nestjs/common';
import { APP_INTERCEPTOR } from '@nestjs/core'
import { ConfigModule, ConfigService } from '@nestjs/config';
import { LoggerModule } from '@/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import configuration from '../config/configuration';
import { TypeOrmModule } from '@nestjs/typeorm';
import { XueXiModule } from '@/modules/xue-xi/xue-xi.module';
import { UserModule } from '@/modules/user/user.module';
import { LoggerMiddleware, ResponseInterceptor  } from '@/common'
import { DbConfigKey } from '@/enums'

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
        entities: [
          __dirname + '/**/*.entity{.ts,.js}'
        ]
      }),
    }),
    XueXiModule,
    UserModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    {
        provide: APP_INTERCEPTOR,
        useClass: ResponseInterceptor,
    },
    Logger
  ],
  exports: [Logger],
})
export class AppModule implements NestModule {
    configure(consumer: MiddlewareConsumer) {
        consumer.apply(LoggerMiddleware).forRoutes({
            path: '*',
            method: RequestMethod.ALL,
        })

    }
}
