import { Inject, Injectable, Logger, type OnModuleDestroy } from "@nestjs/common";
import type { RedisClientType } from "redis";
import { REDIS_CLIENT } from "./redis.constants";

/** Redis 官方 node-redis 客户端的连接、探测和关闭生命周期。 */
@Injectable()
export class RedisService implements OnModuleDestroy {
	private readonly logger = new Logger(RedisService.name);
	private connectPromise?: Promise<void>;
	private lastErrorLoggedAt = 0;

	constructor(@Inject(REDIS_CLIENT) private readonly client: RedisClientType) {
		this.client.on("ready", () => {
			this.lastErrorLoggedAt = 0;
			this.logger.log("Redis 连接已就绪");
		});
		this.client.on("error", (error) => {
			const now = Date.now();
			if (now - this.lastErrorLoggedAt < 60_000) return;
			this.lastErrorLoggedAt = now;
			this.logger.warn(`Redis 连接错误：${error.message}`);
		});
	}

	async ensureConnected(): Promise<void> {
		if (this.client.isReady) return;
		if (!this.client.isOpen) {
			this.connectPromise ??= this.client.connect()
				.then(() => undefined)
				.finally(() => {
					this.connectPromise = undefined;
				});
		}
		if (this.connectPromise) await this.connectPromise;
		if (!this.client.isReady) throw new Error("Redis 尚未就绪");
	}

	async ping(): Promise<boolean> {
		if (!this.client.isOpen) await this.ensureConnected();
		if (!this.client.isReady) return false;
		return (await this.client.ping()) === "PONG";
	}

	async assertRuntimeReady(): Promise<void> {
		await this.ensureConnected();
		if (!(await this.ping())) throw new Error("Redis PING 未返回 PONG");
	}

	/** 普通命令可复用此客户端；阻塞命令、订阅和队列需要独立连接。 */
	getClient(): RedisClientType {
		return this.client;
	}

	async onModuleDestroy(): Promise<void> {
		if (!this.client.isOpen) return;
		try {
			if (this.client.isReady) await this.client.close();
			else this.client.destroy();
		} catch (error) {
			this.logger.warn(`Redis 关闭失败：${String(error)}`);
			this.client.destroy();
		}
	}
}
