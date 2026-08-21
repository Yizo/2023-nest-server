import { Controller, Get, ServiceUnavailableException } from "@nestjs/common";
import { ApiOperation, ApiTags } from "@nestjs/swagger";
import { MikroORM } from "@mikro-orm/postgresql";
import { Public } from "@/common/decorators";
import { RedisService } from "@/infrastructure/redis/redis.service";

/** 健康检查供 Docker/Kubernetes 使用，因此不要求登录。 */
@ApiTags("健康检查")
@Controller("health")
export class HealthController {
  constructor(private readonly orm: MikroORM, private readonly redis: RedisService) {}

  @Public()
  @Get("live")
  @ApiOperation({ summary: "存活检查", description: "只确认进程存活，不检查数据库或 Redis。" })
  // liveness 只回答进程是否活着，不检查数据库，避免依赖故障触发容器重启风暴。
  live() { return { status: "ok" }; }

  @Public()
  @Get("ready")
  @ApiOperation({ summary: "就绪检查", description: "检查 PostgreSQL、Redis 和数据库迁移是否就绪。" })
  async ready() {
    // readiness 同时检查 PostgreSQL、Redis 和 migration，未就绪时不应接收业务流量。
    try {
      await this.orm.em.getConnection().execute("select 1");
      await this.redis.ping();
      const pending = await this.orm.migrator.getPending();
      if (pending.length) throw new Error(`pending migrations: ${pending.map((item: { name: string }) => item.name).join(", ")}`);
      return { status: "ready", database: "ok", redis: "ok", migrations: "up-to-date" };
    } catch {
      throw new ServiceUnavailableException("应用依赖或数据库版本未就绪");
    }
  }
}
