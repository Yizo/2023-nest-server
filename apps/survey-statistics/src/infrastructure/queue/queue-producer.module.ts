import { Global, Module } from "@nestjs/common";
import { BullModule } from "@nestjs/bullmq";
import { env } from "@/config/environment";
import { BACKGROUND_QUEUE } from "./queue.constants";
import { BackgroundJobsService } from "./background-jobs.service";

function redisConnection() {
  // BullMQ 需要拆开的连接参数，而业务层使用一个完整 REDIS_URL。
  const url = new URL(env.redisUrl);
  return {
    host: url.hostname,
    port: Number(url.port || 6379),
    username: url.username || undefined,
    password: url.password || undefined,
    db: url.pathname.length > 1 ? Number(url.pathname.slice(1)) : 0,
  };
}

@Global()
@Module({
  imports: [
    BullModule.forRoot({ connection: redisConnection(), prefix: "survey:queue" }),
    BullModule.registerQueue({ name: BACKGROUND_QUEUE }),
  ],
  providers: [BackgroundJobsService],
  exports: [BackgroundJobsService, BullModule],
})
export class QueueProducerModule {}
