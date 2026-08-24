import { defineConfig, PostgreSqlDriver, type Options } from "@mikro-orm/postgresql";
import { Logger } from "@nestjs/common";
import { createConfiguration, type AdminApiConfig } from "../config";

const mikroOrmLogger = new Logger("MikroORM");

/**
 * 创建 PostgreSQL 的 MikroORM 配置。
 *
 * 第一版没有任何业务实体，因此明确关闭“没有实体时的警告”；同时不配置
 * schema generator、synchronize 或 migrations，应用启动不会修改远程数据库。
 */
export function createMikroOrmOptions(
	config: AdminApiConfig = createConfiguration(process.env),
): Options {
	return defineConfig({
		driver: PostgreSqlDriver,
		clientUrl: config.database.url,
		entities: [],
		discovery: { warnWhenNoEntities: false },
		debug: config.app.nodeEnv === "development",
		// MikroORM 默认直接写 console；改由 Nest Logger 转发到全局 Winston。
		logger: (message) => mikroOrmLogger.log(message),
		pool: { max: 10 },
	});
}
