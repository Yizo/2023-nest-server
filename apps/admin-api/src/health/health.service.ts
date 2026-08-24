import { Injectable, Logger, ServiceUnavailableException } from "@nestjs/common";
import { MikroORM } from "@mikro-orm/postgresql";
import { RedisService } from "../infrastructure/redis";

export interface ReadinessResult {
	status: "ok" | "degraded";
	checks: {
		database: "ok" | "failed";
		redis: "ok" | "failed";
	};
}

/** 健康检查服务；live 不访问依赖，ready 验证 PostgreSQL 和 Redis。 */
@Injectable()
export class HealthService {
	private readonly logger = new Logger(HealthService.name);
	private readonly failureLogIntervalMs = 60_000;
	private readonly lastFailureLoggedAt = { database: 0, redis: 0 };

	constructor(
		private readonly orm: MikroORM,
		private readonly redis: RedisService,
	) {}

	live(): { status: "ok" } {
		return { status: "ok" };
	}

	async ready(): Promise<ReadinessResult> {
		const [database, redis] = await Promise.all([
			this.checkDatabase(),
			this.checkRedis(),
		]);
		const result: ReadinessResult = {
			status: database && redis ? "ok" : "degraded",
			checks: {
				database: database ? "ok" : "failed",
				redis: redis ? "ok" : "failed",
			},
		};

		if (result.status !== "ok") {
			throw new ServiceUnavailableException({
				message: "依赖服务未就绪",
				data: result,
			});
		}
		return result;
	}

	private async checkDatabase(): Promise<boolean> {
		try {
			await this.orm.em.getConnection().execute("select 1");
			this.lastFailureLoggedAt.database = 0;
			return true;
		} catch (error) {
			this.logDependencyFailure("database", `PostgreSQL readiness check failed: ${String(error)}`);
			return false;
		}
	}

	private async checkRedis(): Promise<boolean> {
		try {
			const ready = await this.redis.ping();
			if (ready) this.lastFailureLoggedAt.redis = 0;
			return ready;
		} catch (error) {
			this.logDependencyFailure("redis", `Redis readiness check failed: ${String(error)}`);
			return false;
		}
	}

	/** 同一依赖持续故障时每分钟最多写一条详细原因，恢复后会重新计时。 */
	private logDependencyFailure(dependency: "database" | "redis", message: string): void {
		const now = Date.now();
		if (now - this.lastFailureLoggedAt[dependency] < this.failureLogIntervalMs) return;
		this.lastFailureLoggedAt[dependency] = now;
		this.logger.warn(message);
	}
}
