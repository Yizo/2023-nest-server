import { BadRequestException, Injectable } from "@nestjs/common";
import { EntityManager } from "@mikro-orm/postgresql";
import { decodeCursor, encodeCursor, type CursorResult } from "@/common/pagination/pagination";
import type { ClientErrorListQueryDto } from "./monitoring.dto";

@Injectable()
export class MonitoringQueries {
  constructor(private readonly em: EntityManager) {}

  async listErrors(query: ClientErrorListQueryDto): Promise<CursorResult<Record<string, unknown>>> {
    const params: unknown[] = [query.appId];
    const conditions = ["app_id = ?"];
    if (query.fingerprint) {
      params.push(query.fingerprint);
      conditions.push("fingerprint = ?");
    }
    if (query.cursor) {
      try {
        const cursor = decodeCursor(query.cursor);
        params.push(cursor.createdAt, cursor.id);
        conditions.push("(created_at, id) < (?, ?)");
      } catch {
        throw new BadRequestException("分页标记无效");
      }
    }
    params.push(query.pageSize + 1);
    const rows = await this.em.getConnection().execute<Array<Record<string, unknown> & { id: string; createdAt: Date }>>(
      `select id, app_id as "appId", event_id as "eventId", fingerprint, message, stack, context,
              occurred_at as "occurredAt", processed_at as "processedAt", created_at as "createdAt"
       from client_errors where ${conditions.join(" and ")}
       order by created_at desc, id desc limit ?`,
      params,
    );
    const hasMore = rows.length > query.pageSize;
    const items = hasMore ? rows.slice(0, query.pageSize) : rows;
    const last = items.at(-1);
    return { items, hasMore, nextCursor: hasMore && last ? encodeCursor(new Date(last.createdAt), last.id) : null };
  }

  listGroups(appId: string) {
    return this.em.getConnection().execute<Array<Record<string, unknown>>>(
      `select id, fingerprint, sample_message as "sampleMessage", count,
              first_seen_at as "firstSeenAt", last_seen_at as "lastSeenAt"
       from client_error_groups where app_id = ?
       order by last_seen_at desc, id desc limit 100`,
      [appId],
    );
  }
}
