import { MikroOrmModule } from "@mikro-orm/nestjs";
import { PostgreSqlDriver } from "@mikro-orm/postgresql";
import { Module } from "@nestjs/common";
import { ConfigModule, ConfigService } from "@nestjs/config";
import type { AdminApiConfig } from "../../config";
import { createMikroOrmOptions } from "./mikro-orm.config";

/** MikroORM 官方 Nest 模块负责连接注入、请求上下文和应用关闭。 */
@Module({
	imports: [
		MikroOrmModule.forRootAsync({
			imports: [ConfigModule],
			inject: [ConfigService],
			driver: PostgreSqlDriver as never,
			useFactory: (configService: ConfigService) => {
				const config = configService.getOrThrow<AdminApiConfig>("app");
				return createMikroOrmOptions(config);
			},
		}),
	],
})
export class DatabaseModule {}
