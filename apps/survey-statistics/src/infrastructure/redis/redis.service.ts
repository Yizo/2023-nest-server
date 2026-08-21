import { Injectable, OnApplicationShutdown } from "@nestjs/common";
import Redis from "ioredis";
import { env } from "@/config/environment";

@Injectable()
export class RedisService implements OnApplicationShutdown {
  // lazyConnect 让模块创建时不立即建立连接；第一次使用或 readiness 检查时再连接。
  readonly client = new Redis(env.redisUrl, { lazyConnect: true, maxRetriesPerRequest: 1 });

  async ensureConnected(): Promise<void> {
    if (this.client.status === "wait") await this.client.connect();
  }

  async ping(): Promise<string> {
    await this.ensureConnected();
    return this.client.ping();
  }

  async onApplicationShutdown(): Promise<void> {
    if (this.client.status !== "end") await this.client.quit().catch(() => this.client.disconnect());
  }
}
