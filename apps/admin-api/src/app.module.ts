import { MiddlewareConsumer, Module, NestModule } from "@nestjs/common";
import { APP_FILTER, APP_GUARD, APP_INTERCEPTOR } from "@nestjs/core";
import { ConfigModule } from "@nestjs/config";
import { AppController } from "./app.controller";
import { configuration } from "./config";
import { HttpExceptionFilter } from "./common/filters";
import { AuthPlaceholderGuard } from "./common/guards";
import { RequestLoggingInterceptor, ResponseInterceptor } from "./common/interceptors";
import { RequestIdMiddleware } from "./common/middleware";
import { AppLoggerModule } from "./common/logger";
import { DatabaseModule, MikroOrmRequestContextMiddleware } from "./database";
import { HealthModule } from "./health";
import { RedisModule } from "./infrastructure/redis";

/**
 * admin-api 根模块。
 *
 * 这里仅组装基础设施和全局横切能力，不放任何具体业务模块；未来新增业务
 * 时应以独立 Module 进入 imports，而不是把业务服务继续堆到根模块。
 */
@Module({
	imports: [
		ConfigModule.forRoot({
			isGlobal: true,
			cache: true,
			// dotenv-flow 已完成环境文件加载，这里禁止 ConfigModule 再次读取文件。
			ignoreEnvFile: true,
			load: [configuration],
		}),
		AppLoggerModule,
		DatabaseModule,
		RedisModule,
		HealthModule,
	],
	controllers: [AppController],
	providers: [
		{ provide: APP_FILTER, useClass: HttpExceptionFilter },
		{ provide: APP_GUARD, useClass: AuthPlaceholderGuard },
		{ provide: APP_INTERCEPTOR, useClass: RequestLoggingInterceptor },
		{ provide: APP_INTERCEPTOR, useClass: ResponseInterceptor },
	],
})
export class AppModule implements NestModule {
	configure(consumer: MiddlewareConsumer): void {
		// 所有 HTTP 路由都先经过 Request ID 中间件，保证成功和异常日志可关联。
		// 随后的 ORM 请求上下文为每个请求创建独立 EntityManager，避免并发污染。
		consumer
			.apply(RequestIdMiddleware, MikroOrmRequestContextMiddleware)
			.forRoutes("{*path}");
	}
}
