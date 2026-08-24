import { Global, Module } from "@nestjs/common";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { WinstonModule } from "nest-winston";
import { createWinstonOptions } from "./logger.options";

/** 全局日志模块：控制台始终输出，开发和生产环境同时写入本地滚动文件。 */
@Global()
@Module({
	imports: [
		ConfigModule,
		WinstonModule.forRootAsync({
			imports: [ConfigModule],
			inject: [ConfigService],
			useFactory: (configService: ConfigService) => createWinstonOptions(configService),
		}),
	],
	exports: [WinstonModule],
})
export class AppLoggerModule {}
