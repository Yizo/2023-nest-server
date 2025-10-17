import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import KeyvRedis from '@keyv/redis';
import {
  Module,
  NestModule,
  RequestMethod,
  Logger,
  Global,
} from '@nestjs/common';
import type { MiddlewareConsumer } from '@nestjs/common';
import { APP_INTERCEPTOR, APP_PIPE, APP_FILTER, APP_GUARD } from '@nestjs/core';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CacheModule } from '@nestjs/cache-manager';
import { Reflector } from '@nestjs/core';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import configuration from '../config/configuration';
import { UserModule } from '@/modules/user/user.module';
import { DbConfigKey, RedisConfig } from '@/enums';
import { ProfileModule } from '@/modules/profile/profile.module';
import { AuthModule } from '@/modules/auth/auth.module';
import { LogsModule } from '@/modules/logs/logs.module';
import { RolesModule } from '@/modules/roles/roles.module';
import { CustomValidationPipe } from '@/pipes/validation.pipe';
import { JwtAuthGuard } from '@/modules/auth/guard/jwt.guard';
import {
  CustomExceptionFilter,
  LoggerModule,
  LoggerMiddleware,
  ResponseInterceptor,
  SessionModule,
} from '@/common';

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
    CacheModule.registerAsync({
      inject: [ConfigService],
      isGlobal: true,
      useFactory: (config: Record<string, any>) => {
        const host = config.get(RedisConfig.HOST);
        const port = config.get(RedisConfig.PORT);
        const password = config.get(RedisConfig.PASSWORD);

        const store = new KeyvRedis({
          url: `redis://${host}:${port}`,
          password: password.toString(),
        });

        store.on('error', (error) => {
          console.log('KeyvRedis: error', error);
        });

        return {
          stores: [store],
        };
      },
    }),
    UserModule,
    ProfileModule,
    AuthModule,
    LogsModule,
    SessionModule,
    RolesModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    // 全局拦截器
    {
      provide: APP_INTERCEPTOR,
      useClass: ResponseInterceptor,
    },
    {
      provide: APP_PIPE,
      useClass: CustomValidationPipe,
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
    {
      provide: APP_GUARD,
      useFactory: (reflector: Reflector) => {
        return new JwtAuthGuard(reflector);
      },
      inject: [Reflector],
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
