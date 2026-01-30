import { Global, Module } from "@nestjs/common";
import { APP_FILTER, APP_INTERCEPTOR, APP_PIPE, APP_GUARD } from "@nestjs/core";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { CacheModule } from "@nestjs/cache-manager";
import { TypeOrmModule } from "@nestjs/typeorm";
import KeyvRedis from "@keyv/redis";
import configuration from "../config/configuration";
import { AppController } from "./app.controller";
import { AppService } from "./app.service";
import { AuthModule } from "./modules/auth/auth.module";
import { SurveyModule } from "./modules/survey/survey.module";
import { UserModule } from "./modules/user/user.module";
import { HttpExceptionFilter } from "./common/filters/http-exception.filter";
import { ResponseTransformInterceptor } from "./common/interceptors/response-transform.interceptor";
import { LoggingInterceptor } from "./common/interceptors/logging.interceptor";
import { JwtAuthGuard } from "./modules/auth/jwt/jwt.guard";
import { CustomValidationPipe } from "./common/pipes/validation.pipe";

@Global()
@Module({
	imports: [
		ConfigModule.forRoot({
			isGlobal: true,
			load: [configuration],
		}),
		TypeOrmModule.forRootAsync({
			imports: [ConfigModule],
			inject: [ConfigService],
			useFactory: (config: ConfigService) => {
				const db = config.get("db");

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
					entities: [__dirname + "/**/*.entity{.ts,.js}"],
				};
			},
		}),
		CacheModule.registerAsync({
			inject: [ConfigService],
			isGlobal: true,
			useFactory: (config: ConfigService) => {
				const redis = config.get("redis");
				const store = new KeyvRedis({
					url: `redis://${redis.host}:${redis.port}`,
					password: redis.password?.toString(),
				});
				store.on("error", (error: Error) => {
					console.error("KeyvRedis Error", error);
				});
				return { stores: [store] };
			},
		}),
		UserModule,
		AuthModule,
		SurveyModule,
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
	exports: [AppService],
})
export class AppModule {}
