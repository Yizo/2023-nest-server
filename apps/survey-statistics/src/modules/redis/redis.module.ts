import { Module } from "@nestjs/common";
import { CacheModule } from "@nestjs/cache-manager";
import { ConfigService } from "@nestjs/config";
import KeyvRedis from "@keyv/redis";
import { RedisService } from "./redis.service";

@Module({
	imports: [
		CacheModule.registerAsync({
			inject: [ConfigService],
			isGlobal: true,
			useFactory: (config: ConfigService) => {
				const redis = config.get("redis");
				const store = new KeyvRedis({
					url: `redis://${redis.host}:${redis.port}`,
					password: redis.password?.toString(),
				});
				store.on("error", (error: Error) => {
					console.error("KeyvRedis Error", error);
				});
				return { stores: [store] };
			},
		}),
	],
	providers: [RedisService],
	exports: [RedisService],
})
export class RedisModule {}
