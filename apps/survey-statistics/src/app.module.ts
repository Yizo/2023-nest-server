import { Global, Module } from '@nestjs/common'
import { APP_FILTER, APP_INTERCEPTOR, APP_PIPE, APP_GUARD } from '@nestjs/core'
import { ConfigModule, ConfigService } from '@nestjs/config'
import { TypeOrmModule } from '@nestjs/typeorm'
import { QueryBuilderModule } from '@base/commons'
import { LoggerModule } from './common/logger/logger.module'
import { AuthModule } from './modules/auth/auth.module'
import { SurveyModule } from './modules/survey/survey.module'
import { UserModule } from './modules/user/user.module'
import { RedisModule } from './modules/redis/redis.module'
import { SystemModule } from './modules/system/system.module'
import { WebsocketModule } from './modules/websocket/websocket.module'
import configuration from './config/configuration'
import { AppController } from './app.controller'
import { AppService } from './app.service'
import { HttpExceptionFilter } from './common/filters/http-exception.filter'
import { ResponseTransformInterceptor } from './common/interceptors/response-transform.interceptor'
import { LoggingInterceptor } from './common/interceptors/logging.interceptor'
import { JwtAuthGuard } from './modules/auth/jwt/jwt.guard'
import { CustomValidationPipe } from './common/pipes/validation.pipe'

@Global()
@Module({
  imports: [
    /**************全局模块**************/
    LoggerModule.forRoot(),
    ConfigModule.forRoot({
      isGlobal: true,
      load: [configuration],
    }),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => {
        const db = config.get('db')

        return {
          type: db.type,
          host: db.host,
          port: db.port,
          username: db.username,
          password: db.password,
          database: db.database,
          timezone: db.timezone,
          synchronize: db.synchronize,
          logging: db.logging,
          logger: db.logger,
          createForeignKeyConstraints: db.createForeignKeyConstraints,
          autoLoadEntities: true,
          cache: true,
          entities: [__dirname + '/**/*.entity{.ts,.js}'],
        }
      },
    }),
    QueryBuilderModule,
    RedisModule,
    /**************全局模块**************/
    UserModule,
    AuthModule,
    SurveyModule,
    SystemModule,
    WebsocketModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    {
      provide: APP_INTERCEPTOR,
      useClass: LoggingInterceptor,
    },
    {
      provide: APP_INTERCEPTOR,
      useClass: ResponseTransformInterceptor,
    },
    {
      provide: APP_FILTER,
      useClass: HttpExceptionFilter,
    },
    {
      provide: APP_PIPE,
      useClass: CustomValidationPipe,
    },
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard,
    },
  ],
})
export class AppModule {}
