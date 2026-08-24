import { Inject, Injectable, Logger, OnModuleDestroy } from "@nestjs/common";
import Redis from "ioredis";
import { REDIS_CLIENT } from "./redis.constants";

/** Redis 基础操作封装；第一版只提供连接生命周期和 PING 检查。 */
@Injectable()
export class RedisService implements OnModuleDestroy {
	private readonly logger = new Logger(RedisService.name);
	private lastErrorLoggedAt = 0;
	private readonly errorLogIntervalMs = 60_000;

	constructor(@Inject(REDIS_CLIENT) private readonly client: Redis) {
		// ioredis 没有 error listener 时会把连接失败升级为未捕获事件；
		// 健康检查会把它转换为 503，这里只记录原因并保持进程可启动。
		this.client.on("error", (error) => {
			// ioredis 在远程服务不可用时会按重试策略重复发出 error；
			// 日志限流避免 readiness 探测把本地文件刷满。
			const now = Date.now();
			if (now - this.lastErrorLoggedAt < this.errorLogIntervalMs) return;
			this.lastErrorLoggedAt = now;
			this.logger.warn(`Redis client error: ${error.message}`);
		});
	}

	/** 启动懒连接并验证 Redis 是否能够响应。 */
	async ping(): Promise<boolean> {
		if (this.client.status === "wait") await this.client.connect();
		return (await this.client.ping()) === "PONG";
	}

	/** 仅在未来需要缓存或队列时开放底层客户端，当前业务不直接依赖它。 */
	getClient(): Redis {
		return this.client;
	}

	async onModuleDestroy(): Promise<void> {
		if (this.client.status === "end") return;
		if (this.client.status !== "ready") {
			this.client.disconnect();
			return;
		}
		try {
			await this.client.quit();
		} catch (error) {
			this.logger.warn(`Redis connection close failed: ${String(error)}`);
			this.client.disconnect();
		}
	}
}
