import { Global, Module } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import Redis from "ioredis";
import type { AdminApiConfig } from "../../config";
import { REDIS_CLIENT } from "./redis.constants";
import { RedisService } from "./redis.service";

/** Redis 连接模块；不创建 BullMQ、缓存或业务队列。 */
@Global()
@Module({
	providers: [
		{
			provide: REDIS_CLIENT,
			inject: [ConfigService],
			useFactory: (configService: ConfigService) => {
				const config = configService.getOrThrow<AdminApiConfig>("app");
				return new Redis(config.redis.url, {
					lazyConnect: true,
					maxRetriesPerRequest: 1,
					enableOfflineQueue: false,
				});
			},
		},
		RedisService,
	],
	exports: [RedisService],
})
export class RedisModule {}
