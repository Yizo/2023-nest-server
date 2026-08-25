import { Global, Module } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { createClient } from "redis";
import type { AdminApiConfig } from "@/config";
import { REDIS_CLIENT } from "./redis.constants";
import { RedisService } from "./redis.service";

/**
 * Redis 连接模块；只提供单实例命令客户端。
 * 不在这里创建 BullMQ、缓存封装或订阅连接，那些需要独立 Redis 连接。
 */
@Global()
@Module({
	providers: [
		{
			provide: REDIS_CLIENT,
			inject: [ConfigService],
			useFactory: (configService: ConfigService) => {
				const config = configService.getOrThrow<AdminApiConfig>("app");
				const client = createClient({
					url: config.redis.url,
					name: `${config.app.name}-${config.app.nodeEnv}`,
					keyPrefix: `${config.app.name}:${config.app.nodeEnv}:`,
					disableOfflineQueue: true,
					socket: {
						connectTimeout: 5_000,
						keepAlive: true,
						keepAliveInitialDelay: 30_000,
						reconnectStrategy: (attempt) => Math.min(attempt * 50, 5_000),
					},
				});
				return client;
			},
		},
		RedisService,
	],
	exports: [RedisService],
})
export class RedisModule {}
