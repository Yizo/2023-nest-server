import { ConflictException, Injectable, NotFoundException, UnauthorizedException } from "@nestjs/common";
import { EntityManager } from "@mikro-orm/postgresql";
import { createHash, randomBytes } from "node:crypto";
import { newId } from "@/common/utils/ids";
import { ClientError, MonitorApp } from "@/database/entities";
import { BackgroundJobsService } from "@/infrastructure/queue/background-jobs.service";
import type { CreateMonitorAppDto, MonitorAppListQueryDto, ReportClientErrorDto, SdkErrorReportDto, UpdateMonitorAppDto } from "./monitoring.dto";
import type { PageResult } from "@/common/pagination/pagination";

@Injectable()
export class MonitoringService {
  constructor(private readonly em: EntityManager, private readonly jobs: BackgroundJobsService) {}

  async listApps(query: MonitorAppListQueryDto): Promise<PageResult<Record<string, unknown>>> {
    const conditions = ["deleted_at is null"];
    const params: unknown[] = [];
    if (query.name) { conditions.push("name ilike ?"); params.push(`%${query.name}%`); }
    if (query.code) { conditions.push("code ilike ?"); params.push(`%${query.code}%`); }
    if (query.enabled !== undefined) { conditions.push("enabled = ?"); params.push(query.enabled); }
    const where = conditions.join(" and ");
    const connection = this.em.getConnection();
    const countRows = await connection.execute<Array<{ total: string }>>(
      `select count(*)::text as total from monitor_apps where ${where}`,
      params,
    );
    const items = await connection.execute<Array<Record<string, unknown>>>(
      `select id, code, name, enabled, created_at as "createdAt", updated_at as "updatedAt"
       from monitor_apps where ${where}
       order by updated_at desc, id desc limit ? offset ?`,
      [...params, query.pageSize, (query.page - 1) * query.pageSize],
    );
    return { items, page: query.page, pageSize: query.pageSize, total: Number(countRows[0]?.total ?? 0) };
  }

  async createApp(input: CreateMonitorAppDto): Promise<{ id: string; ingestKey: string }> {
    // ingestKey 只在创建时返回明文，数据库只保存 hash，泄漏数据库不会直接泄漏上报凭据。
    if (await this.em.findOne(MonitorApp, { code: input.code })) throw new ConflictException("监控应用编码已存在");
    const ingestKey = randomBytes(32).toString("base64url");
    const app = this.em.create(MonitorApp, { code: input.code, name: input.name, ingestKeyHash: this.hash(ingestKey) });
    this.em.persist(app);
    await this.em.flush();
    return { id: app.id, ingestKey };
  }

  async updateApp(id: string, input: UpdateMonitorAppDto): Promise<void> {
    const app = await this.em.findOne(MonitorApp, { id, deletedAt: null });
    if (!app) throw new NotFoundException("监控应用不存在");
    if (input.name !== undefined) app.name = input.name;
    if (input.enabled !== undefined) app.enabled = input.enabled;
    await this.em.flush();
  }

  async report(input: ReportClientErrorDto, requestId?: string): Promise<{ id: string; duplicate: boolean }> {
    // eventId 是客户端重试幂等键；网络重试不会制造多条相同错误。
    const app = await this.em.findOne(MonitorApp, { code: input.appCode, deletedAt: null });
    if (!app || !app.enabled || app.ingestKeyHash !== this.hash(input.ingestKey)) throw new UnauthorizedException("监控应用凭据无效");
    const existing = await this.em.findOne(ClientError, { appId: app.id, eventId: input.eventId }, { fields: ["id"] });
    if (existing) return { id: existing.id, duplicate: true };
    // context 先脱敏再落库，避免 password/token/authorization 等敏感字段进入监控表。
    const error = this.em.create(ClientError, {
      appId: app.id,
      eventId: input.eventId,
      fingerprint: this.fingerprint(input.message, input.stack),
      message: input.message,
      stack: input.stack ?? null,
      context: this.sanitizeContext(input.context),
      occurredAt: new Date(input.occurredAt),
    });
    try {
      this.em.persist(error);
      await this.em.flush();
    } catch (cause) {
      const duplicate = await this.em.fork().findOne(ClientError, { appId: app.id, eventId: input.eventId }, { fields: ["id"] });
      if (duplicate) return { id: duplicate.id, duplicate: true };
      throw cause;
    }
    await this.jobs.monitorError(error.id, requestId);
    return { id: error.id, duplicate: false };
  }

  /** 把前端 SDK 批量载荷转换成内部错误记录，并按 eventId 幂等写入。 */
  async reportSdkBatch(
    inputs: SdkErrorReportDto[],
    requestId?: string,
  ): Promise<{ accepted: number; duplicates: number }> {
    let duplicates = 0;
    for (const input of inputs) {
      const result = await this.report({
        appCode: input.appId,
        ingestKey: input.ingestKey,
        eventId: this.sdkEventId(input),
        message: input.message,
        stack: input.stack,
        occurredAt: new Date(input.timestamp).toISOString(),
        context: {
          ...(input.context ?? {}),
          eventType: input.type,
          url: input.url ?? null,
          release: input.release ?? null,
          tags: input.tags ?? {},
          extra: input.extra ?? {},
        },
      }, requestId);
      if (result.duplicate) duplicates += 1;
    }
    return { accepted: inputs.length, duplicates };
  }

  async aggregate(errorId: string): Promise<void> {
    // update ... returning 让“只处理一次”与聚合写入处于同一事务。
    await this.em.transactional(async (em) => {
      const rows = await em.getConnection().execute<Array<{ app_id: string; fingerprint: string; message: string; occurred_at: Date }>>(
        `update client_errors set processed_at = now(), updated_at = now()
         where id = ? and processed_at is null
         returning app_id, fingerprint, message, occurred_at`,
        [errorId],
      );
      const error = rows[0];
      if (!error) return;
      await em.getConnection().execute(
        `insert into client_error_groups
           (id, app_id, fingerprint, sample_message, count, first_seen_at, last_seen_at, created_at, updated_at)
         values (?, ?, ?, ?, 1, ?, ?, now(), now())
         on conflict (app_id, fingerprint) do update set
           count = client_error_groups.count + 1,
           sample_message = excluded.sample_message,
           last_seen_at = greatest(client_error_groups.last_seen_at, excluded.last_seen_at),
           updated_at = now()`,
        [newId(), error.app_id, error.fingerprint, error.message, error.occurred_at, error.occurred_at],
      );
    });
  }

  async unprocessedIds(limit = 500): Promise<string[]> {
    const rows = await this.em.getConnection().execute<Array<{ id: string }>>(
      `select id from client_errors where processed_at is null order by created_at asc limit ?`,
      [limit],
    );
    return rows.map((row) => row.id);
  }

  private fingerprint(message: string, stack?: string): string {
    // 只取前几行 stack，避免动态行号或过长堆栈把同类错误拆成大量分组。
    const topFrames = (stack ?? "").split("\n").slice(0, 4).join("\n");
    return createHash("sha256").update(`${message}\n${topFrames}`).digest("hex");
  }

  private sdkEventId(input: SdkErrorReportDto): string {
    return `sdk:${createHash("sha256")
      .update(JSON.stringify([input.appId, input.type, input.message, input.timestamp, input.stack ?? ""]))
      .digest("hex")}`;
  }

  private hash(value: string): string {
    return createHash("sha256").update(value).digest("hex");
  }

  private sanitizeContext(context: Record<string, unknown>): Record<string, unknown> {
    const blocked = /password|token|authorization|cookie|secret/i;
    const sanitize = (value: unknown, depth: number): unknown => {
      if (depth > 4) return "[已省略：嵌套层级过深]";
      if (Array.isArray(value)) return value.slice(0, 50).map((item) => sanitize(item, depth + 1));
      if (value && typeof value === "object") {
        return Object.fromEntries(
          Object.entries(value as Record<string, unknown>)
            .filter(([key]) => !blocked.test(key))
            .slice(0, 50)
            .map(([key, item]) => [key, sanitize(item, depth + 1)]),
        );
      }
      return value;
    };
    return sanitize(context, 0) as Record<string, unknown>;
  }
}
