import { Injectable, Logger } from "@nestjs/common";
import { EntityManager } from "@mikro-orm/postgresql";
import { SystemService } from "@/modules/system/system.service";

@Injectable()
export class MonitoringMaintenanceService {
  private readonly logger = new Logger(MonitoringMaintenanceService.name);

  constructor(private readonly em: EntityManager, private readonly system: SystemService) {}

  async cleanupExpiredErrors(): Promise<number> {
    const retentionDays = await this.system.numberConfig("monitor.retention_days", 30);
    let total = 0;
    for (let batch = 0; batch < 20; batch += 1) {
      const result = await this.em.getConnection().execute<Array<{ id: string }>>(
        `delete from client_errors where id in (
           select id from client_errors
           where created_at < now() - (? * interval '1 day')
           order by created_at asc limit 1000
         ) returning id`,
        [retentionDays],
      );
      total += result.length;
      if (result.length < 1_000) break;
    }
    this.logger.log(JSON.stringify({ event: "monitor_retention_cleanup", retentionDays, deleted: total }));
    return total;
  }
}
