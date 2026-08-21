import { Injectable, Logger, ServiceUnavailableException } from "@nestjs/common";
import { InjectQueue } from "@nestjs/bullmq";
import type { JobsOptions, Queue } from "bullmq";
import { BACKGROUND_QUEUE, JOB_NAMES, type JobName } from "./queue.constants";

interface EntityJobPayload {
  v: 1;
  entityId: string;
  requestId?: string;
}

function entityJobId(name: JobName, entityId: string): string {
  // BullMQ reserves ':' in custom job IDs. Keep this deterministic so reconcile
  // can find and retry the exact same entity job without publishing duplicates.
  return `${name}--${entityId}`;
}

@Injectable()
export class BackgroundJobsService {
  private readonly logger = new Logger(BackgroundJobsService.name);

  constructor(@InjectQueue(BACKGROUND_QUEUE) private readonly queue: Queue) {}

  async addEntityJob(name: JobName, entityId: string, requestId?: string, required = false): Promise<void> {
    // 任务默认处理“数据库记录写入后要做的附带动作”。发布失败先记录日志，
    // 后续由 reconcile 扫描 pending 数据补发；required=true 才会阻断请求。
    const options: JobsOptions = {
      jobId: entityJobId(name, entityId),
      attempts: 3,
      backoff: { type: "exponential", delay: 5_000 },
      removeOnComplete: { age: 86_400, count: 1_000 },
      removeOnFail: { age: 604_800, count: 5_000 },
    };
    try {
      await this.queue.add(name, { v: 1, entityId, requestId } satisfies EntityJobPayload, options);
    } catch (error) {
      this.logger.error(JSON.stringify({ event: "queue_publish_failed", name, entityId, error: String(error) }));
      if (required) throw new ServiceUnavailableException("后台任务服务暂时不可用");
    }
  }

  notification(recipientId: string, requestId?: string): Promise<void> {
    return this.addEntityJob(JOB_NAMES.notificationDispatch, recipientId, requestId);
  }

  monitorError(errorId: string, requestId?: string): Promise<void> {
    return this.addEntityJob(JOB_NAMES.monitorErrorAggregate, errorId, requestId);
  }

  async ensureEntityJob(name: JobName, entityId: string): Promise<void> {
    // reconcile 使用相同 jobId 保证补偿是幂等的，不会无限创建重复任务。
    const jobId = entityJobId(name, entityId);
    const existing = await this.queue.getJob(jobId);
    if (existing) {
      const state = await existing.getState();
      if (state === "failed") {
        await existing.retry();
        return;
      }
      if (state === "completed") await existing.remove();
      else return;
    }
    await this.addEntityJob(name, entityId);
  }

  async syncSchedules(): Promise<void> {
    // 调度器也使用 upsert，部署脚本重复执行不会产生多个清理任务。
    await this.queue.upsertJobScheduler(
      "retention-cleanup-daily",
      { pattern: "0 2 * * *", tz: "Asia/Shanghai" },
      { name: JOB_NAMES.retentionCleanup, data: { v: 1 } },
    );
    await this.queue.upsertJobScheduler(
      "reconcile-every-minute",
      { every: 60_000 },
      { name: JOB_NAMES.reconcile, data: { v: 1 } },
    );
    await this.queue.upsertJobScheduler(
      "integrity-audit-daily",
      { pattern: "30 2 * * *", tz: "Asia/Shanghai" },
      { name: JOB_NAMES.integrityAudit, data: { v: 1 } },
    );
  }

  getQueue(): Queue {
    return this.queue;
  }
}
