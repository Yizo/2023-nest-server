import { MiddlewareConsumer, Module, NestModule } from "@nestjs/common";
import { APP_FILTER, APP_GUARD, APP_INTERCEPTOR } from "@nestjs/core";
import { ConfigModule } from "@nestjs/config";
import { ThrottlerGuard, ThrottlerModule } from "@nestjs/throttler";
import { MikroOrmModule } from "@mikro-orm/nestjs";
import type { MikroOrmModuleSyncOptions } from "@mikro-orm/nestjs";
import { createMikroOrmOptions } from "@/database/mikro-orm.options";
import { env } from "@/config/environment";
import { ApiExceptionFilter } from "@/common/filters/api-exception.filter";
import { ApiResponseInterceptor } from "@/common/interceptors/api-response.interceptor";
import { HttpLoggingInterceptor } from "@/common/interceptors/http-logging.interceptor";
import { RequestIdMiddleware } from "@/common/middleware/request-id.middleware";
import { RedisModule } from "@/infrastructure/redis/redis.module";
import { QueueProducerModule } from "@/infrastructure/queue/queue-producer.module";
import { QueueConsumerModule } from "@/infrastructure/queue/queue-consumer.module";
import { AuthModule } from "@/modules/auth/auth.module";
import { JwtAuthGuard, PermissionGuard } from "@/modules/auth/auth.guards";
import { IdentityModule } from "@/modules/identity/identity.module";
import { SystemModule } from "@/modules/system/system.module";
import { SurveyModule } from "@/modules/survey/survey.module";
import { MonitoringModule } from "@/modules/monitoring/monitoring.module";
import { NotificationsModule } from "@/modules/notifications/notifications.module";
import { RealtimeModule } from "@/modules/realtime/realtime.module";
import { HealthModule } from "@/modules/health/health.module";
import { AppLoggerModule } from "@/common/logger";

// all 进程同时提供 API 和消费任务；api 进程只提供 HTTP；worker 进程使用 WorkerModule。
const consumerImports = env.processRole === "all" ? [QueueConsumerModule] : [];

@Module({
  imports: [
    AppLoggerModule,
    // ConfigModule 负责 Nest 的 ConfigService；环境变量本身在 environment.ts 中先加载。
    ConfigModule.forRoot({ isGlobal: true }),
    // MikroORM 只连接数据库和读取实体，不会在应用启动时自动改表。
    MikroOrmModule.forRoot(createMikroOrmOptions() as unknown as MikroOrmModuleSyncOptions),
    RedisModule,
    QueueProducerModule,
    ThrottlerModule.forRoot({
      throttlers: [{ ttl: 60_000, limit: 100 }],
      errorMessage: "请求过于频繁，请稍后再试",
    }),
    IdentityModule,
    AuthModule,
    SystemModule,
    SurveyModule,
    MonitoringModule,
    NotificationsModule,
    RealtimeModule,
    HealthModule,
    ...consumerImports,
  ],
  providers: [
    // Guard 顺序：先验证 JWT，再检查业务权限；Throttler 限制请求速率。
    { provide: APP_GUARD, useClass: ThrottlerGuard },
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: PermissionGuard },
    { provide: APP_INTERCEPTOR, useClass: HttpLoggingInterceptor },
    { provide: APP_INTERCEPTOR, useClass: ApiResponseInterceptor },
    { provide: APP_FILTER, useClass: ApiExceptionFilter },
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer): void {
    consumer.apply(RequestIdMiddleware).forRoutes("{*path}");
  }
}
