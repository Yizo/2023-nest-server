import { Injectable, Logger, OnApplicationShutdown } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import { EntityManager } from "@mikro-orm/postgresql";
import { OnGatewayConnection, OnGatewayInit, WebSocketGateway, WebSocketServer } from "@nestjs/websockets";
import type { Server, Socket } from "socket.io";
import Redis from "ioredis";
import { env } from "@/config/environment";
import type { AccessTokenPayload } from "@/common/types/auth.types";
import { User } from "@/database/entities";

@Injectable()
@WebSocketGateway({ namespace: "/notifications", cors: { origin: env.corsOrigins, credentials: true } })
export class RealtimeGateway implements OnGatewayInit, OnGatewayConnection, OnApplicationShutdown {
  @WebSocketServer() private server!: Server;
  private readonly logger = new Logger(RealtimeGateway.name);
  private readonly subscriber = new Redis(env.redisUrl, { lazyConnect: true, maxRetriesPerRequest: null });

  constructor(private readonly jwt: JwtService, private readonly em: EntityManager) {}

  async afterInit(): Promise<void> {
    await this.subscriber.connect();
    await this.subscriber.psubscribe("survey:realtime:user:*");
    this.subscriber.on("pmessage", (_pattern, channel, message) => {
      const userId = channel.slice("survey:realtime:user:".length);
      try { this.server.to(`user:${userId}`).emit("notification.created", JSON.parse(message)); }
      catch (error) { this.logger.warn(`invalid realtime payload: ${String(error)}`); }
    });
  }

  async handleConnection(client: Socket): Promise<void> {
    const authToken = typeof client.handshake.auth?.token === "string" ? client.handshake.auth.token : undefined;
    const header = client.handshake.headers.authorization;
    const token = authToken ?? (header?.startsWith("Bearer ") ? header.slice(7) : undefined);
    if (!token) {
      client.disconnect(true);
      return;
    }
    try {
      const payload = await this.jwt.verifyAsync<AccessTokenPayload>(token, { secret: env.jwtAccessSecret });
      if (payload.type !== "access") throw new Error("invalid token type");
      const user = await this.em.fork().findOne(User, { id: payload.sub, status: "active", deletedAt: null }, { fields: ["id"] });
      if (!user) throw new Error("user unavailable");
      await client.join(`user:${user.id}`);
    } catch {
      client.disconnect(true);
    }
  }

  async onApplicationShutdown(): Promise<void> {
    if (this.subscriber.status !== "end") await this.subscriber.quit().catch(() => this.subscriber.disconnect());
  }
}
