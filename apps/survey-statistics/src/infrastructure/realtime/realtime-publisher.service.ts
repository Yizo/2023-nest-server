import { Injectable, Module, OnApplicationShutdown } from "@nestjs/common";
import Redis from "ioredis";
import { env } from "@/config/environment";

export interface RealtimeNotificationEvent {
  notificationId: string;
  recipientId: string;
}

@Injectable()
export class RealtimePublisher implements OnApplicationShutdown {
  private readonly publisher = new Redis(env.redisUrl, { lazyConnect: true, maxRetriesPerRequest: 1 });

  async publishToUser(userId: string, event: RealtimeNotificationEvent): Promise<void> {
    // Redis Pub/Sub 只负责在线通知，不保存业务记录；记录已经在 PostgreSQL 中落库。
    if (this.publisher.status === "wait") await this.publisher.connect();
    await this.publisher.publish(`survey:realtime:user:${userId}`, JSON.stringify(event));
  }

  async onApplicationShutdown(): Promise<void> {
    if (this.publisher.status !== "end") await this.publisher.quit().catch(() => this.publisher.disconnect());
  }
}

@Module({ providers: [RealtimePublisher], exports: [RealtimePublisher] })
export class RealtimePublisherModule {}
