import { Module } from "@nestjs/common";
import { DatabaseModule } from "@/infrastructure/database";
import { RedisModule } from "@/infrastructure/redis";
import { HealthController } from "./health.controller";
import { HealthService } from "./health.service";

@Module({
	imports: [DatabaseModule, RedisModule],
	controllers: [HealthController],
	providers: [HealthService],
})
export class HealthModule {}
