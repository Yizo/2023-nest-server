import { Global, Injectable, Module, OnApplicationShutdown } from "@nestjs/common";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { MikroORM } from "@mikro-orm/postgresql";
import type { AdminApiConfig } from "../config";
import { createMikroOrmOptions } from "./mikro-orm.config";

/** 负责在 Nest 容器中创建和关闭 MikroORM 实例。 */
@Injectable()
class DatabaseConnectionLifecycle implements OnApplicationShutdown {
	constructor(private readonly orm: MikroORM) {}

	async onApplicationShutdown(): Promise<void> {
		await this.orm.close(true);
	}
}

/** 全局数据库模块；创建 PostgreSQL ORM 实例，但不执行 schema 修改。 */
@Global()
@Module({
	imports: [ConfigModule],
	providers: [
		{
			provide: MikroORM,
			inject: [ConfigService],
			useFactory: (configService: ConfigService) => {
				const config = configService.getOrThrow<AdminApiConfig>("app");
				// 实体将通过类引用显式注册，因此同步构造即可完成元数据发现；
				// 数据库不可用时应用仍能启动，并由 readiness 接口报告未就绪。
				return new MikroORM(createMikroOrmOptions(config));
			},
		},
		DatabaseConnectionLifecycle,
	],
	exports: [MikroORM],
})
export class DatabaseModule {}
