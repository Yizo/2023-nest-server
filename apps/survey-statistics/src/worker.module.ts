import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { MikroOrmModule } from "@mikro-orm/nestjs";
import type { MikroOrmModuleSyncOptions } from "@mikro-orm/nestjs";
import { createMikroOrmOptions } from "@/database/mikro-orm.options";
import { RedisModule } from "@/infrastructure/redis/redis.module";
import { QueueProducerModule } from "@/infrastructure/queue/queue-producer.module";
import { QueueConsumerModule } from "@/infrastructure/queue/queue-consumer.module";
import { AppLoggerModule } from "@/common/logger";

// WorkerModule 没有 HTTP Controller；它复用数据库和队列模块执行后台任务。
@Module({
  imports: [
    AppLoggerModule,
    ConfigModule.forRoot({ isGlobal: true }),
    MikroOrmModule.forRoot(createMikroOrmOptions() as unknown as MikroOrmModuleSyncOptions),
    RedisModule,
    QueueProducerModule,
    QueueConsumerModule,
  ],
})
export class WorkerModule {}
