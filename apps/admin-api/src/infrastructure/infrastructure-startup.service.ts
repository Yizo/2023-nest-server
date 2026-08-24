import { MikroORM } from "@mikro-orm/postgresql";
import {
	Injectable,
	Logger,
	type OnApplicationBootstrap,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import type { AdminApiConfig } from "../config";
import { RedisService } from "./redis";

/** 在 HTTP 监听前统一验证硬依赖，避免半就绪进程进入反向代理。 */
@Injectable()
export class InfrastructureStartupService implements OnApplicationBootstrap {
	private readonly logger = new Logger(InfrastructureStartupService.name);

	constructor(
		private readonly orm: MikroORM,
		private readonly redis: RedisService,
		private readonly configService: ConfigService,
	) {}

	async onApplicationBootstrap(): Promise<void> {
		try {
			await this.orm.connect();
			const config = this.configService.getOrThrow<AdminApiConfig>("app");
			if (config.database.synchronize) {
				this.logger.warn("开发环境已启用数据库结构同步");
				await this.orm.schema.update();
			}
			await Promise.all([
				this.orm.em.getConnection().execute("select 1"),
				this.redis.assertRuntimeReady(),
			]);
		} catch {
			this.logger.error("基础设施启动检查失败");
			throw new Error("PostgreSQL 或 Redis 未就绪");
		}
		this.logger.log("PostgreSQL 与 Redis 检查通过");
	}
}
