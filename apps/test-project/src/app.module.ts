import { Module, DynamicModule, NestModule, type MiddlewareConsumer, RequestMethod } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { LoggerModule } from '@/modules/logger/logger.module';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import configuration from '../config/configuration';
import { TypeOrmModule } from '@nestjs/typeorm';
import { XueXiModule } from '@/modules/xue-xi/xue-xi.module';
import { UserModule } from '@/modules/user/user.module';
import { LoggerMiddleware } from '@/modules/logger/logger.middleware'

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
        type: config.get('db.type'),
        autoLoadEntities: config.get('db.autoLoadEntities'),
        migrationsRun: config.get('db.migrationsRun'),
        host: config.get('db.host'),
        port: config.get('db.port'),
        username: config.get('db.username'),
        password: config.get('db.password'),
        database: config.get('db.database'),
        timezone: config.get('db.timezone'),
        synchronize: config.get('db.synchronize'),
        logging: config.get('db.logging'),
        logger: config.get('db.logger'),
        entities: [
          __dirname + '/**/*.entity{.ts,.js}'
        ]
      }),
    }),
    XueXiModule,
    UserModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule implements NestModule {
    configure(consumer: MiddlewareConsumer) {
        consumer.apply(LoggerMiddleware).forRoutes({
            path: '*',
            method: RequestMethod.ALL,
        })
    }
}
