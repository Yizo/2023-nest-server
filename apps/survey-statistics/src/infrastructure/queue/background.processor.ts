import { Logger } from "@nestjs/common";
import { OnWorkerEvent, Processor, WorkerHost } from "@nestjs/bullmq";
import { RequestContext } from "@mikro-orm/core";
import { MikroORM } from "@mikro-orm/postgresql";
import type { Job } from "bullmq";
import { env } from "@/config/environment";
import { IntegrityAuditService } from "@/database/integrity-audit.service";
import { MonitoringMaintenanceService } from "@/modules/monitoring/monitoring-maintenance.service";
import { MonitoringService } from "@/modules/monitoring/monitoring.service";
import { NotificationsService } from "@/modules/notifications/notifications.service";
import { BackgroundJobsService } from "./background-jobs.service";
import { BACKGROUND_QUEUE, JOB_NAMES } from "./queue.constants";

@Processor(BACKGROUND_QUEUE, { concurrency: env.queueConcurrency })
export class BackgroundProcessor extends WorkerHost {
  private readonly logger = new Logger(BackgroundProcessor.name);

  constructor(
    private readonly orm: MikroORM,
    private readonly notifications: NotificationsService,
    private readonly monitoring: MonitoringService,
    private readonly maintenance: MonitoringMaintenanceService,
    private readonly integrity: IntegrityAuditService,
    private readonly jobs: BackgroundJobsService,
  ) { super(); }

  override process(job: Job<{ v: number; entityId?: string }>): Promise<unknown> {
    // BullMQ 的 Worker 回调不天然带 MikroORM 请求上下文，
    // 每个任务都创建上下文，保证 EntityManager 的 identity map 隔离。
    return RequestContext.create(this.orm.em, () => this.processInContext(job));
  }

  private async processInContext(job: Job<{ v: number; entityId?: string }>): Promise<unknown> {
    // 载荷带版本号，为以后升级任务结构保留兼容判断点。
    if (job.data.v !== 1) throw new Error(`Unsupported job payload version: ${job.data.v}`);
    switch (job.name) {
      case JOB_NAMES.notificationDispatch:
        if (!job.data.entityId) throw new Error("notification recipient id is required");
        return this.notifications.dispatch(job.data.entityId);
      case JOB_NAMES.monitorErrorAggregate:
        if (!job.data.entityId) throw new Error("client error id is required");
        return this.monitoring.aggregate(job.data.entityId);
      case JOB_NAMES.retentionCleanup:
        return this.maintenance.cleanupExpiredErrors();
      case JOB_NAMES.reconcile:
        return this.reconcile();
      case JOB_NAMES.integrityAudit:
        return this.integrity.run();
      default:
        throw new Error(`Unknown job name: ${job.name}`);
    }
  }

  @OnWorkerEvent("failed")
  onFailed(job: Job | undefined, error: Error): void {
    this.logger.error(JSON.stringify({ event: "queue_job_failed", jobId: job?.id, name: job?.name, error: error.message }));
  }

  private async reconcile(): Promise<{ notifications: number; errors: number }> {
    // Redis 队列可能丢失，但 PostgreSQL 的 pending/processed 状态仍然是待处理记录的判断依据。
    const [notificationIds, errorIds] = await Promise.all([
      this.notifications.pendingIds(),
      this.monitoring.unprocessedIds(),
    ]);
    for (const id of notificationIds) await this.jobs.ensureEntityJob(JOB_NAMES.notificationDispatch, id);
    for (const id of errorIds) await this.jobs.ensureEntityJob(JOB_NAMES.monitorErrorAggregate, id);
    return { notifications: notificationIds.length, errors: errorIds.length };
  }
}
