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
import { DatabaseModule } from "./infrastructure/database";
import { InfrastructureStartupService } from "./infrastructure/infrastructure-startup.service";
import { RedisModule } from "./infrastructure/redis";
import { DictModule } from "./modules/dict/dict.module";
import { DepartmentModule } from "./modules/department/department.module";
import { HealthModule } from "./modules/health";
import { RoleModule } from "./modules/role/role.module";
import { SystemInitializationModule } from "./modules/system-initialization/system-initialization.module";

/**
 * admin-api 根模块。
 *
 * 这里只组装基础设施、全局横切能力和 modules 下的业务模块。
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
		DictModule,
		DepartmentModule,
		RoleModule,
		SystemInitializationModule,
	],
	controllers: [AppController],
	providers: [
		InfrastructureStartupService,
		{ provide: APP_FILTER, useClass: HttpExceptionFilter },
		{ provide: APP_GUARD, useClass: AuthPlaceholderGuard },
		{ provide: APP_INTERCEPTOR, useClass: RequestLoggingInterceptor },
		{ provide: APP_INTERCEPTOR, useClass: ResponseInterceptor },
	],
})
export class AppModule implements NestModule {
	configure(consumer: MiddlewareConsumer): void {
		// ORM 请求上下文由 @mikro-orm/nestjs 注册，这里只负责请求标识。
		consumer.apply(RequestIdMiddleware).forRoutes("{*path}");
	}
}
